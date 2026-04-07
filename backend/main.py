import os
import ssl
import socket
from datetime import datetime, timezone
from typing import List, Optional

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from dotenv import load_dotenv

# Charger les variables d'environnement (.env)
load_dotenv()

# --- CONFIGURATION DATABASE ---
# Récupération des variables avec valeurs par défaut
DB_USER = os.getenv("NXH_DATABASE_USER", "test")
DB_PASSWORD = os.getenv("NXH_DATABASE_PASSWORD", "test")
DB_HOST = os.getenv("NXH_DATABASE_HOST", "localhost")
DB_PORT = os.getenv("NXH_DATABASE_PORT", "3306")
DB_NAME = os.getenv("NXH_DATABASE_NAME", "test")

# Construction de l'URL de connexion MySQL pour SQLAlchemy
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# --- MODÈLE SQLALCHEMY (Base de données) ---
class Domain(Base):
    __tablename__ = "domains"
    id = Column(Integer, primary_key=True, index=True)
    hostname = Column(String(255), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

# Créer les tables au démarrage (si elles n'existent pas)
# Note : La base de données `DB_NAME` doit déjà exister dans MySQL.
Base.metadata.create_all(bind=engine)

# --- SCHÉMAS PYDANTIC (Validation API) ---
class DomainCreate(BaseModel):
    domain: str

class BulkDomainCreate(BaseModel):
    domains: List[str]

# --- DEPENDENCY ---
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# --- INITIALISATION API ---
app = FastAPI(title="SSL Certs Monitor API")

# Récupération de l'URL Frontend pour les CORS
ALLOWED_ORIGINS = os.getenv("NXH_API_URL", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- LOGIQUE MÉTIER (SSL CHECK) ---
def check_ssl_certificate(domain: str) -> dict:
    try:
        context = ssl.create_default_context()
        with socket.create_connection((domain, 443), timeout=10) as sock:
            with context.wrap_socket(sock, server_hostname=domain) as ssock:
                cert_der = ssock.getpeercert(binary_form=True)

        cert = x509.load_der_x509_certificate(cert_der, default_backend())

        # Gestion des versions Python pour l'expiration
        try:
            expiry_date = cert.not_valid_after_utc
            now = datetime.now(timezone.utc)
        except AttributeError:
            expiry_date = cert.not_valid_after
            now = datetime.utcnow()

        days_remaining = (expiry_date.replace(tzinfo=None) - now.replace(tzinfo=None)).days

        if days_remaining < 0:
            status = "expired"
        elif days_remaining <= 30:
            status = "warning"
        else:
            status = "valid"

        return {
            "domain": domain,
            "status": status,
            "days_remaining": days_remaining,
            "expiry_date": expiry_date.strftime("%Y-%m-%d"),
            "issuer": cert.issuer.rfc4514_string(),
        }

    except Exception as e:
        return {
            "domain": domain, 
            "status": "error", 
            "error": str(e), 
            "days_remaining": None, 
            "expiry_date": None
        }

# --- ENDPOINTS API ---

@app.get("/health")
def health():
    return {"status": "ok", "database": "connected"}

@app.get("/api/status")
def get_all_status(t: Optional[int] = Query(None), db: Session = Depends(get_db)):
    """Récupère le statut SSL de tous les domaines stockés en base de données."""
    db_domains = db.query(Domain).all()
    results = [check_ssl_certificate(d.hostname) for d in db_domains]
    return results

@app.get("/api/domains")
def list_domains(db: Session = Depends(get_db)):
    """Liste tous les domaines enregistrés."""
    db_domains = db.query(Domain).all()
    return {"domains": [d.hostname for d in db_domains]}

@app.post("/api/domains")
def add_domain(payload: DomainCreate, db: Session = Depends(get_db)):
    """Ajoute un nouveau domaine à la base de données."""
    domain_name = payload.domain.strip().lower()
    if not domain_name:
        raise HTTPException(status_code=400, detail="Domaine invalide")
    
    # Vérifier l'existence
    existing = db.query(Domain).filter(Domain.hostname == domain_name).first()
    if existing:
        return {"message": "Domaine déjà présent", "domain": domain_name}
    
    new_domain = Domain(hostname=domain_name)
    db.add(new_domain)
    db.commit()
    return {"message": "Domaine ajouté", "domain": domain_name}

@app.post("/api/domains/bulk")
def add_domains_bulk(payload: BulkDomainCreate, db: Session = Depends(get_db)):
    """Ajoute plusieurs domaines en une seule fois."""
    added = []
    for domain_name in payload.domains:
        name = domain_name.strip().lower()
        if name:
            existing = db.query(Domain).filter(Domain.hostname == name).first()
            if not existing:
                db.add(Domain(hostname=name))
                added.append(name)
    
    db.commit()
    return {"message": f"{len(added)} domaine(s) ajouté(s)", "added": added}

@app.delete("/api/domains/{domain_name}")
def delete_domain(domain_name: str, db: Session = Depends(get_db)):
    """Supprime un domaine de la base de données."""
    domain = db.query(Domain).filter(Domain.hostname == domain_name).first()
    if not domain:
        raise HTTPException(status_code=404, detail="Domaine non trouvé")
    
    db.delete(domain)
    db.commit()
    return {"message": "Domaine supprimé"}

@app.get("/api/check/{domain_name}")
def check_single_domain(domain_name: str):
    """Vérifie un domaine à la volée sans forcément qu'il soit en base."""
    return check_ssl_certificate(domain_name)

@app.get("/api/check-all")
def check_all_domains(db: Session = Depends(get_db)):
    """Force une vérification de tous les domaines enregistrés."""
    db_domains = db.query(Domain).all()
    results = [check_ssl_certificate(d.hostname) for d in db_domains]
    return {"results": results}