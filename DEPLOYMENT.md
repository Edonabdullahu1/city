# Ubuntu VPS Deployment Guide

Complete guide to deploy the City Travel Agency application on a fresh Ubuntu VPS.

## Prerequisites

- Fresh Ubuntu 20.04+ VPS
- Root or sudo access
- Domain name (optional but recommended)
- Minimum 2GB RAM, 2 CPU cores, 20GB storage

## Step 1: Initial Server Setup

### 1.1 Connect to Your VPS

```bash
ssh root@your_server_ip
```

### 1.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 1.3 Create a Deployment User (Optional but Recommended)

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## Step 2: Install Node.js and npm

### 2.1 Install Node.js 20.x (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2.2 Verify Installation

```bash
node --version  # Should show v20.x.x
npm --version   # Should show 10.x.x
```

## Step 3: Install PostgreSQL

### 3.1 Install PostgreSQL 14+

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 3.2 Start PostgreSQL Service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3.3 Create Database and User

```bash
sudo -u postgres psql

# Inside PostgreSQL prompt:
CREATE DATABASE travel_agency_db;
CREATE USER city_user WITH PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE travel_agency_db TO city_user;

# Grant schema privileges (PostgreSQL 15+)
\c travel_agency_db
GRANT ALL ON SCHEMA public TO city_user;
ALTER DATABASE travel_agency_db OWNER TO city_user;

# Exit PostgreSQL
\q
```

### 3.4 Configure PostgreSQL for Local Connections (if needed)

Edit `/etc/postgresql/14/main/pg_hba.conf`:

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

Add or modify this line:
```
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

## Step 4: Install Git

```bash
sudo apt install -y git
```

## Step 5: Clone Your Repository

### 5.1 Set Up SSH Key (Recommended)

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
```

Copy the public key and add it to your GitHub account (Settings → SSH Keys).

### 5.2 Clone the Repository

```bash
cd /var/www
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
git clone git@github.com:Edonabdullahu1/city.git
cd city
```

## Step 6: Configure Environment Variables

### 6.1 Create Production .env File

```bash
cp .env.example .env
nano .env
```

### 6.2 Configure Essential Variables

```env
# Database
DATABASE_URL="postgresql://city_user:your_strong_password_here@localhost:5432/travel_agency_db?schema=public"

# NextAuth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=generate_random_string_with_openssl_rand_base64_32

# App Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Email Configuration (Mailgun)
ENABLE_EMAIL=true
MAILGUN_SMTP_USER=city@vav.al
MAILGUN_SMTP_PASSWORD=your_mailgun_password
MAILGUN_HOST=smtp.mailgun.org
MAILGUN_PORT=587
MAILGUN_SECURE=false
MAILGUN_FROM_NAME="MXi Travel Agency"
EMAIL_FROM="MXi Travel Agency <city@vav.al>"

# Google Flights API (SerpAPI)
SERP_API_KEY=your_serpapi_key

# WhatsApp Integration (n8n)
N8N_WEBHOOK_URL=your_n8n_webhook_url
```

### 6.3 Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

Copy the output and paste it as `NEXTAUTH_SECRET` in your `.env` file.

## Step 7: Install Dependencies and Build

### 7.1 Install npm Packages

```bash
npm install
```

### 7.2 Generate Prisma Client

```bash
npx prisma generate
```

### 7.3 Run Database Migrations

```bash
npx prisma migrate deploy
```

### 7.4 Seed Database (Optional)

```bash
npx prisma db seed
```

### 7.5 Build Next.js Application

```bash
npm run build
```

## Step 8: Install and Configure PM2

PM2 keeps your Node.js application running and restarts it on crashes.

### 8.1 Install PM2 Globally

```bash
sudo npm install -g pm2
```

### 8.2 Create PM2 Ecosystem File

```bash
nano ecosystem.config.js
```

Add this configuration:

```javascript
module.exports = {
  apps: [{
    name: 'city-travel',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/city',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '1G'
  }]
};
```

### 8.3 Create Logs Directory

```bash
mkdir -p logs
```

### 8.4 Start Application with PM2

```bash
pm2 start ecosystem.config.js
```

### 8.5 Save PM2 Configuration

```bash
pm2 save
pm2 startup
```

Run the command that PM2 outputs (it will look like `sudo env PATH=...`).

### 8.6 Useful PM2 Commands

```bash
pm2 status              # Check status
pm2 logs city-travel    # View logs
pm2 restart city-travel # Restart app
pm2 stop city-travel    # Stop app
pm2 delete city-travel  # Remove from PM2
pm2 monit              # Monitor resources
```

## Step 9: Install and Configure Nginx

### 9.1 Install Nginx

```bash
sudo apt install -y nginx
```

### 9.2 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/city-travel
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Increase buffer sizes for large requests
    client_max_body_size 50M;
    client_body_buffer_size 128k;

    # Proxy settings
    proxy_connect_timeout 600s;
    proxy_send_timeout 600s;
    proxy_read_timeout 600s;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Cache static assets
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, immutable";
    }
}
```

### 9.3 Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/city-travel /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

## Step 10: Configure Firewall

### 10.1 Enable UFW Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

## Step 11: Install SSL Certificate (Let's Encrypt)

### 11.1 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 11.2 Obtain SSL Certificate

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts. Certbot will automatically update your Nginx configuration.

### 11.3 Test Auto-Renewal

```bash
sudo certbot renew --dry-run
```

## Step 12: Set Up Automatic Backups

### 12.1 Create Backup Script

```bash
sudo nano /usr/local/bin/backup-database.sh
```

Add this script:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/var/backups/postgresql"
DB_NAME="travel_agency_db"
DB_USER="city_user"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Create backup
PGPASSWORD='your_strong_password_here' pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_FILE

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

### 12.2 Make Script Executable

```bash
sudo chmod +x /usr/local/bin/backup-database.sh
```

### 12.3 Set Up Cron Job for Daily Backups

```bash
sudo crontab -e
```

Add this line (runs daily at 2 AM):

```
0 2 * * * /usr/local/bin/backup-database.sh >> /var/log/db-backup.log 2>&1
```

## Step 13: Set Up Log Rotation

### 13.1 Create Log Rotation Configuration

```bash
sudo nano /etc/logrotate.d/city-travel
```

Add:

```
/var/www/city/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 deploy deploy
}
```

## Step 14: Monitoring and Maintenance

### 14.1 Monitor Application Logs

```bash
pm2 logs city-travel --lines 100
```

### 14.2 Monitor Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 14.3 Monitor Database

```bash
sudo -u postgres psql -d travel_agency_db -c "SELECT * FROM pg_stat_activity;"
```

### 14.4 Check Disk Space

```bash
df -h
```

### 14.5 Check Memory Usage

```bash
free -h
```

## Step 15: Deployment Updates

When you push new code to GitHub:

### 15.1 Create Update Script

```bash
nano /var/www/city/deploy.sh
```

Add:

```bash
#!/bin/bash

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm install

# Run database migrations
npx prisma generate
npx prisma migrate deploy

# Build application
npm run build

# Restart PM2
pm2 restart city-travel

echo "✅ Deployment complete!"
```

### 15.2 Make Script Executable

```bash
chmod +x deploy.sh
```

### 15.3 Run Deployment

```bash
./deploy.sh
```

## Troubleshooting

### Application Not Starting

```bash
# Check PM2 logs
pm2 logs city-travel

# Check if port 3000 is in use
sudo lsof -i :3000

# Restart PM2
pm2 restart city-travel
```

### Database Connection Issues

```bash
# Test database connection
psql -U city_user -d travel_agency_db -h localhost

# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Nginx Issues

```bash
# Test Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart Nginx
sudo systemctl restart nginx
```

### Memory Issues

```bash
# Check memory usage
free -h
pm2 status

# Restart application if needed
pm2 restart city-travel
```

## Security Best Practices

1. **Keep system updated:**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Change default SSH port** (edit `/etc/ssh/sshd_config`)

3. **Disable root login** (edit `/etc/ssh/sshd_config`, set `PermitRootLogin no`)

4. **Install fail2ban:**
   ```bash
   sudo apt install fail2ban
   sudo systemctl enable fail2ban
   ```

5. **Regular backups** - Ensure your backup script is running

6. **Monitor logs** regularly for suspicious activity

7. **Keep dependencies updated:**
   ```bash
   npm audit
   npm audit fix
   ```

## Performance Optimization

### Enable Nginx Gzip Compression

Edit `/etc/nginx/nginx.conf`:

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript application/json application/javascript application/xml+rss application/rss+xml font/truetype font/opentype application/vnd.ms-fontobject image/svg+xml;
```

### Enable Node.js Production Optimizations

Already set in `.env`:
```env
NODE_ENV=production
```

### PM2 Cluster Mode

Already configured in `ecosystem.config.js` with `instances: 'max'`.

## Useful Commands Summary

```bash
# Application Management
pm2 status                    # Check app status
pm2 logs city-travel         # View logs
pm2 restart city-travel      # Restart app
pm2 monit                    # Monitor resources

# Database
sudo -u postgres psql -d travel_agency_db  # Connect to database
npx prisma studio                          # Open Prisma Studio (dev only)

# Nginx
sudo nginx -t                # Test configuration
sudo systemctl restart nginx # Restart Nginx
sudo tail -f /var/log/nginx/error.log  # View error logs

# System
df -h                        # Check disk space
free -h                      # Check memory
htop                         # System monitor
```

## Support

For issues or questions:
- Check logs: `pm2 logs city-travel`
- Review Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check database connectivity
- Verify environment variables in `.env`

## Conclusion

Your City Travel Agency application should now be running on your Ubuntu VPS with:
- ✅ Node.js and Next.js application
- ✅ PostgreSQL database
- ✅ PM2 process management
- ✅ Nginx reverse proxy
- ✅ SSL certificate
- ✅ Automatic backups
- ✅ Log rotation
- ✅ Firewall configured

Access your application at: `https://yourdomain.com`
