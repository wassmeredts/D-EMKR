# Flugzeug-Verwaltung

Web-App für Reservierung, Flugbuch, Mängelliste und Wartung (Teile mit Laufzeit)
mit echten Benutzerkonten. Technik: Next.js, Supabase (Datenbank + Login), Vercel (Hosting).

## So funktioniert die Benutzerverwaltung

- Jeder Pilot erstellt selbst ein Konto (E-Mail + Passwort).
- **Der allererste Benutzer, der sich registriert, wird automatisch Administrator.** Das bist du, also registriere dich als Erstes selbst.
- Alle weiteren Konten sehen zunächst keine Daten ("Warten auf Freigabe"). Du gibst sie im Menü **Einstellungen** frei.
- Piloten dürfen: reservieren, Flüge erfassen, Mängel melden und deren Status ändern. Eigene Reservierungen/Flüge können sie löschen.
- Nur Administratoren dürfen: Teile mit Laufzeit verwalten, Benutzer freigeben, Kennzeichen/Typ/Stundenstand ändern, Mängel löschen.

---

## Einrichtung in 4 Schritten (ca. 30–45 Minuten)

### Schritt 1: Supabase (Datenbank + Login)

1. Auf <https://supabase.com> ein kostenloses Konto anlegen und **New project** wählen.
   - Region: **Zurich** (oder Frankfurt), falls angeboten.
   - Ein starkes Datenbank-Passwort vergeben und irgendwo sicher notieren.
2. Warten, bis das Projekt bereit ist (1–2 Minuten).
3. Links **SQL Editor** → **New query**. Den kompletten Inhalt der Datei `supabase/schema.sql` einfügen und **Run** klicken. Es sollte "Success" erscheinen.
4. Links **Project Settings → API** (oder "API Keys"). Dort zwei Werte kopieren:
   - **Project URL**
   - **anon / public key** (bei neueren Projekten heisst er teils "publishable key")

### Schritt 2: Lokal ausprobieren (optional, aber empfohlen)

Voraussetzung: [Node.js](https://nodejs.org) (Version 20 oder neuer) installiert.

```bash
npm install
cp .env.example .env.local     # dann .env.local öffnen und die zwei Werte aus Schritt 1 eintragen
npm run dev
```

Dann <http://localhost:3000> öffnen und ein Konto erstellen.

### Schritt 3: Online stellen mit Vercel

1. Den Projektordner auf **GitHub** hochladen (kostenloses Konto bei <https://github.com>, neues Repository, Dateien hochladen). Die Dateien `.env.local` und `node_modules` dürfen dabei **nicht** mit hochgeladen werden (sind per `.gitignore` ausgeschlossen).
2. Auf <https://vercel.com> mit dem GitHub-Konto anmelden → **Add New → Project** → das Repository auswählen.
3. Vor dem Deploy unter **Environment Variables** die zwei Werte eintragen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. **Deploy** klicken. Nach ca. 1 Minute hast du eine Adresse wie `deine-app.vercel.app`.

### Schritt 4: Login-Links in Supabase erlauben (wichtig!)

Damit die Links in Bestätigungs- und Passwort-zurücksetzen-Mails funktionieren:

1. In Supabase: **Authentication → URL Configuration**.
2. **Site URL**: deine Vercel-Adresse eintragen (z.B. `https://deine-app.vercel.app`).
3. **Redirect URLs**: `https://deine-app.vercel.app/**` hinzufügen (und bei lokalem Testen zusätzlich `http://localhost:3000/**`).

Danach: Registriere dich als Erster auf deiner Seite. Du bist Administrator.

---

## Eigene Domain (green.ch)

Das ist optional und geht jederzeit nachträglich:

1. In Vercel: Projekt → **Settings → Domains** → deine Domain eintragen (z.B. `flug.deinedomain.ch`).
2. Vercel zeigt dir, welchen DNS-Eintrag du setzen musst (bei Subdomains meist ein **CNAME**, bei der Hauptdomain ein **A-Eintrag**).
3. Im green.ch-Kundencenter bei der Domain die **DNS-Verwaltung** öffnen und diesen Eintrag hinzufügen. Es kann bis zu einigen Stunden dauern, bis er aktiv ist.
4. Danach in Supabase (Schritt 4) **Site URL** und **Redirect URLs** auf die neue Domain ändern.

---

## Schon eingerichtet und ein Update eingespielt?

Hast du `supabase/schema.sql` schon früher ausgeführt, fehlt dir die Tabelle für die **Wartungshistorie**. Führe dann einmalig die Datei `supabase/migration-wartungshistorie.sql` im SQL Editor aus (gleiche Schritte wie oben). Bei einer frischen Einrichtung brauchst du das nicht, `schema.sql` enthält sie bereits.

## Gut zu wissen

- **E-Mail-Versand:** Supabase verschickt Bestätigungs-Mails im kostenlosen Plan nur mit stark begrenzter Anzahl pro Stunde. Für eine kleine Gruppe reicht das. Wenn du es entspannter willst, kannst du unter *Authentication → Providers → Email* die Option "Confirm email" ausschalten (dann ist kein Klick auf einen Mail-Link nötig; die Freigabe durch dich als Administrator schützt die Daten trotzdem).
- **Kostenloser Plan:** Supabase pausiert kostenlose Projekte nach 7 Tagen ohne Aktivität. Bei regelmässiger Nutzung kein Problem; sonst im Dashboard mit einem Klick wieder aktivieren.
- **Datensicherung:** Unter *Database → Backups* im Supabase-Dashboard siehst du, was dein Plan abdeckt. Für ein Flugbuch lohnt sich zusätzlich ein gelegentlicher Export (*Table Editor → Export*).
- **Rechtlicher Hinweis:** Dieses Tool ersetzt weder das offizielle Bordbuch noch die vorgeschriebene Wartungsdokumentation, sondern ergänzt sie. Massgebend bleiben die Vorgaben der zuständigen Behörde bzw. deines Wartungsbetriebs.
