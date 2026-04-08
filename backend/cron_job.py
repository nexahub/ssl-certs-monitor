import asyncio
import ssl
import json
import os
import smtplib
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import List, Dict
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# --- CONFIGURATION (Synchronisée avec main.py) ---
DB_USER = os.getenv("NXH_DATABASE_USER", "test")
DB_PASSWORD = os.getenv("NXH_DATABASE_PASSWORD", "test")
DB_HOST = os.getenv("NXH_DATABASE_HOST", "localhost")
DB_PORT = os.getenv("NXH_DATABASE_PORT", "3306")
DB_NAME = os.getenv("NXH_DATABASE_NAME", "test")

DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# SMTP Configuration
SMTP_SERVER = os.getenv("NXH_SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("NXH_SMTP_PORT", 587))
SMTP_SENDER = os.getenv("NXH_SMTP_SENDER_EMAIL", "")
SMTP_PASSWORD = os.getenv("NXH_SMTP_PASSWORD", "")
ALERT_RECIPIENTS = os.getenv("NXH_ALERT_RECIPIENTS", "")

# App Configuration
ALERT_THRESHOLD_DAYS = 30
STATUS_FILE = "/app/data/ssl_status.json"

# --- DB SETUP (Synchronisé avec main.py) ---
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Domain(Base):
    __tablename__ = "domains"
    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# --- LOGIQUE D'ALERTE ---
def send_alert_email(domain: str, days_remaining: int, expiry_date: str, status: str):
    """Envoie un email d'alerte si le certificat expire bientôt ou est expiré."""
    if not SMTP_SENDER or not SMTP_PASSWORD or not ALERT_RECIPIENTS:
        print(f"-> ⚠️ Configuration SMTP manquante. Alerte non envoyée pour {domain}.")
        return

    msg = EmailMessage()
    msg['From'] = SMTP_SENDER
    msg['To'] = ALERT_RECIPIENTS

    if status == "expired":
        msg['Subject'] = f"🚨 URGENT : Le certificat SSL pour {domain} EST EXPIRÉ !"
        body = f"Bonjour,\n\nLe certificat SSL pour le domaine {domain} est expiré depuis le {expiry_date}.\nIl est urgent de le renouveler.\n\nCordialement,\nSSL Monitor"
    else:
        msg['Subject'] = f"⚠️ Alerte SSL : Le certificat pour {domain} expire dans {days_remaining} jours"
        body = f"Bonjour,\n\nLe certificat SSL pour le domaine {domain} va expirer le {expiry_date} (dans {days_remaining} jours).\nPensez à le renouveler.\n\nCordialement,\nSSL Monitor"

    msg.set_content(body)

    try:
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_SENDER, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"-> ✅ Email d'alerte envoyé pour {domain}")
    except Exception as e:
        print(f"-> ❌ Erreur lors de l'envoi de l'email pour {domain} : {str(e)}")

# --- LOGIQUE DE VÉRIFICATION SSL ---
async def get_ssl_expiry_info(hostname: str) -> Dict:
    """Vérifie le certificat SSL d'un domaine de manière asynchrone."""
    context = ssl.create_default_context()
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(hostname, 443, ssl=context),
            timeout=10.0
        )
        cert = writer.get_extra_info('peercert')
        writer.close()
        await writer.wait_closed()

        expiry_date_str = cert['notAfter']
        expiry_date = datetime.strptime(expiry_date_str, '%b %d %H:%M:%S %Y %Z').replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        days_remaining = (expiry_date - now).days
        
        if days_remaining < 0:
            status = "expired"
        elif days_remaining <= ALERT_THRESHOLD_DAYS:
            status = "warning"
        else:
            status = "valid"

        return {
            "domain": hostname,
            "status": status,
            "days_remaining": days_remaining,
            "expiry_date": expiry_date.strftime("%Y-%m-%d")
        }
    except Exception as e:
        return {
            "domain": hostname, 
            "status": "error", 
            "error": str(e), 
            "days_remaining": None, 
            "expiry_date": None
        }

def read_domains_from_db() -> List[str]:
    """Récupère la liste des domaines depuis la base de données MySQL."""
    db = SessionLocal()
    try:
        db_domains = db.query(Domain).all()
        return [d.hostname for d in db_domains]
    finally:
        db.close()

# --- TÂCHE PRINCIPALE ---
async def main():
    """Orchestre la vérification et l'envoi d'alertes."""
    print(f"--- Lancement de la vérification SSL ({datetime.now()}) ---")
    
    domains = read_domains_from_db()
    if not domains:
        print("-> Aucun domaine trouvé en base de données.")
        return

    print(f"-> Vérification de {len(domains)} domaines...")
    tasks = [get_ssl_expiry_info(domain) for domain in domains]
    results = await asyncio.gather(*tasks)
    
    # Mise à jour du fichier de statut pour le frontend (si utilisé)
    try:
        os.makedirs(os.path.dirname(STATUS_FILE), exist_ok=True)
        with open(STATUS_FILE, "w") as f:
            json.dump(results, f, indent=2)
        print(f"-> Rapport JSON mis à jour dans {STATUS_FILE}")
    except Exception as e:
        print(f"-> ⚠️ Impossible d'écrire le rapport JSON : {e}")

    # Traitement des alertes
    for res in results:
        if res.get("status") in ["warning", "expired"]:
            send_alert_email(
                domain=res["domain"],
                days_remaining=res.get("days_remaining", 0),
                expiry_date=res.get("expiry_date", "Inconnue"),
                status=res["status"]
            )

    print("--- Vérification terminée ---")

if __name__ == "__main__":
    asyncio.run(main())