import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Optional

from models.bewerbung import Bewerbung
from models.user import User


class EmailService:
    """Service zum Versenden von E-Mail-Benachrichtigungen"""

    def __init__(self):
        self.logger = logging.getLogger(f"{__name__}.EmailService")
        
        # Email-Konfiguration aus Umgebungsvariablen laden
        self.smtp_config = {
            "server": os.getenv("SMTP_SERVER", "smtp.gmail.com"),
            "port": int(os.getenv("SMTP_PORT", "587")),
            "username": os.getenv("SMTP_USERNAME", ""),
            "password": os.getenv("SMTP_PASSWORD", ""),
            "sender_name": os.getenv("EMAIL_SENDER_NAME", "WohnBlitzer"),
        }
        
        # Warnung ausgeben, wenn E-Mail-Konfiguration fehlt
        if not self.smtp_config["username"] or not self.smtp_config["password"]:
            self.logger.warning(
                "E-Mail-Konfiguration unvollständig. "
                "Setzen Sie SMTP_USERNAME und SMTP_PASSWORD als Umgebungsvariablen."
            )

    def send_application_confirmation(
        self, user: User, bewerbung: Bewerbung, listing_details: Dict = None
    ) -> bool:
        """Sendet eine Bestätigungsmail für eine erfolgreiche Bewerbung"""
        try:
            subject = f"Bewerbung erfolgreich versendet: {bewerbung.wohnungsname}"
            
            # HTML-Template für die E-Mail
            html_content = self._create_application_confirmation_html(
                user, bewerbung, listing_details
            )
            
            # Text-Version als Fallback
            text_content = self._create_application_confirmation_text(
                user, bewerbung, listing_details
            )
            
            return self._send_email(
                recipient_email=user.email,
                recipient_name=f"{user.vorname} {user.nachname}",
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )
            
        except Exception as e:
            self.logger.error(f"Fehler beim Senden der Bestätigungsmail für Bewerbung {bewerbung.id}: {e}")
            return False

    def send_application_error_notification(
        self, user: User, bewerbung: Bewerbung, error_message: str
    ) -> bool:
        """Sendet eine Benachrichtigung über einen Fehler bei der Bewerbung"""
        try:
            subject = f"Fehler bei Bewerbung: {bewerbung.wohnungsname}"
            
            html_content = f"""
            <html>
            <body>
                <h2>Fehler bei automatischer Bewerbung</h2>
                <p>Liebe/r {user.vorname},</p>
                
                <p>Bei der automatischen Bewerbung für folgende Wohnung ist ein Fehler aufgetreten:</p>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #dc3545; margin: 15px 0;">
                    <h3 style="color: #dc3545; margin: 0 0 10px 0;">{bewerbung.wohnungsname}</h3>
                    <p><strong>Adresse:</strong> {bewerbung.adresse}</p>
                    <p><strong>Preis:</strong> {bewerbung.preis} €</p>
                    <p><strong>Zimmer:</strong> {bewerbung.anzahl_zimmer}</p>
                </div>
                
                <p><strong>Fehlermeldung:</strong> {error_message}</p>
                
                <p>Bitte überprüfen Sie Ihre Bot-Einstellungen oder versuchen Sie, sich manuell zu bewerben.</p>
                
                <p>Mit freundlichen Grüßen,<br>
                Ihr WohnBlitzer-Team</p>
            </body>
            </html>
            """
            
            text_content = f"""
            Fehler bei automatischer Bewerbung
            
            Liebe/r {user.vorname},
            
            Bei der automatischen Bewerbung für folgende Wohnung ist ein Fehler aufgetreten:
            
            Wohnung: {bewerbung.wohnungsname}
            Adresse: {bewerbung.adresse}
            Preis: {bewerbung.preis} €
            Zimmer: {bewerbung.anzahl_zimmer}
            
            Fehlermeldung: {error_message}
            
            Bitte überprüfen Sie Ihre Bot-Einstellungen oder versuchen Sie, sich manuell zu bewerben.
            
            Mit freundlichen Grüßen,
            Ihr WohnBlitzer-Team
            """
            
            return self._send_email(
                recipient_email=user.email,
                recipient_name=f"{user.vorname} {user.nachname}",
                subject=subject,
                html_content=html_content,
                text_content=text_content,
            )
            
        except Exception as e:
            self.logger.error(f"Fehler beim Senden der Fehlermeldungs-Mail für Bewerbung {bewerbung.id}: {e}")
            return False

    def _create_application_confirmation_html(
        self, user: User, bewerbung: Bewerbung, listing_details: Dict = None
    ) -> str:
        """Erstellt den HTML-Inhalt für die Bestätigungsmail"""
        now = datetime.now().strftime("%d.%m.%Y um %H:%M")
        
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #2c5aa0;">Bewerbung erfolgreich versendet! 🏠</h2>
                
                <p>Liebe/r {user.vorname},</p>
                
                <p>Ihre automatische Bewerbung wurde erfolgreich versendet:</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #28a745; margin: 20px 0;">
                    <h3 style="color: #28a745; margin: 0 0 15px 0;">{bewerbung.wohnungsname}</h3>
                    <p style="margin: 5px 0;"><strong>📍 Adresse:</strong> {bewerbung.adresse}</p>
                    <p style="margin: 5px 0;"><strong>💰 Preis:</strong> {bewerbung.preis} €</p>
                    <p style="margin: 5px 0;"><strong>🏠 Zimmer:</strong> {bewerbung.anzahl_zimmer}</p>
                    <p style="margin: 5px 0;"><strong>📅 Bewerbungsdatum:</strong> {now}</p>
                </div>
                
                <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <h4 style="color: #2c5aa0; margin: 0 0 10px 0;">Was passiert als nächstes?</h4>
                    <ul style="margin: 0; padding-left: 20px;">
                        <li>Ihre Bewerbung wurde an den Vermieter gesendet</li>
                        <li>Sie erhalten eine separate Bestätigung direkt vom Vermieter</li>
                        <li>WohnBlitzer sucht weiter automatisch nach passenden Angeboten</li>
                    </ul>
                </div>
                
                <p style="font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px;">
                    Mit freundlichen Grüßen,<br>
                    <strong>Ihr WohnBlitzer-Team</strong><br>
                    <em>Automatische Wohnungssuche leicht gemacht</em>
                </p>
            </div>
        </body>
        </html>
        """

    def _create_application_confirmation_text(
        self, user: User, bewerbung: Bewerbung, listing_details: Dict = None
    ) -> str:
        """Erstellt den Text-Inhalt für die Bestätigungsmail"""
        now = datetime.now().strftime("%d.%m.%Y um %H:%M")
        
        return f"""
        Bewerbung erfolgreich versendet!
        
        Liebe/r {user.vorname},
        
        Ihre automatische Bewerbung wurde erfolgreich versendet:
        
        WOHNUNGSDETAILS:
        ================
        Titel: {bewerbung.wohnungsname}
        Adresse: {bewerbung.adresse}
        Preis: {bewerbung.preis} €
        Zimmer: {bewerbung.anzahl_zimmer}
        Bewerbungsdatum: {now}
        
        WAS PASSIERT ALS NÄCHSTES?
        =========================
        - Ihre Bewerbung wurde an den Vermieter gesendet
        - Sie erhalten eine separate Bestätigung direkt vom Vermieter
        - WohnBlitzer sucht weiter automatisch nach passenden Angeboten
        
        Mit freundlichen Grüßen,
        Ihr WohnBlitzer-Team
        Automatische Wohnungssuche leicht gemacht
        """

    def _send_email(
        self,
        recipient_email: str,
        recipient_name: str,
        subject: str,
        html_content: str,
        text_content: str,
    ) -> bool:
        """Sendet eine E-Mail über SMTP"""
        
        # Prüfen, ob E-Mail-Konfiguration vollständig ist
        if not self.smtp_config["username"] or not self.smtp_config["password"]:
            self.logger.warning(
                f"E-Mail kann nicht gesendet werden an {recipient_email}. "
                "SMTP-Konfiguration unvollständig."
            )
            return False
            
        try:
            # E-Mail-Nachricht erstellen
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.smtp_config['sender_name']} <{self.smtp_config['username']}>"
            msg["To"] = f"{recipient_name} <{recipient_email}>"
            
            # Text- und HTML-Teile hinzufügen
            part1 = MIMEText(text_content, "plain", "utf-8")
            part2 = MIMEText(html_content, "html", "utf-8")
            
            msg.attach(part1)
            msg.attach(part2)
            
            # E-Mail senden
            with smtplib.SMTP(self.smtp_config["server"], self.smtp_config["port"]) as server:
                server.starttls()
                server.login(self.smtp_config["username"], self.smtp_config["password"])
                server.send_message(msg)
            
            self.logger.info(f"Bestätigungsmail erfolgreich gesendet an {recipient_email}")
            return True
            
        except Exception as e:
            self.logger.error(f"Fehler beim Senden der E-Mail an {recipient_email}: {e}")
            return False

    def test_email_configuration(self) -> bool:
        """Testet die E-Mail-Konfiguration"""
        try:
            with smtplib.SMTP(self.smtp_config["server"], self.smtp_config["port"]) as server:
                server.starttls()
                server.login(self.smtp_config["username"], self.smtp_config["password"])
            
            self.logger.info("E-Mail-Konfiguration erfolgreich getestet")
            return True
            
        except Exception as e:
            self.logger.error(f"E-Mail-Konfiguration fehlerhaft: {e}")
            return False


# Globale EmailService-Instanz
email_service = EmailService()
