# Database Setup Guide

## PostgreSQL Installation

### Option 1: Download PostgreSQL Installer
1. Download PostgreSQL from: https://www.postgresql.org/download/windows/
2. Run the installer and follow the setup wizard
3. Remember the password you set for the 'postgres' user
4. Default port is usually 5432

### Option 2: Using Docker (Recommended for Development)
```bash
# Run PostgreSQL in Docker
docker run --name travel-agency-postgres -e POSTGRES_PASSWORD=yourpassword -e POSTGRES_DB=travel_agency_db -p 5432:5432 -d postgres:15

# Check if it's running
docker ps

# Connect to the database
docker exec -it travel-agency-postgres psql -U postgres -d travel_agency_db
```

### Option 3: Using WSL2
```bash
# Install PostgreSQL in WSL2
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo service postgresql start

# Create database
sudo -u postgres createdb travel_agency_db
```

## Database Configuration

Once PostgreSQL is installed, update the connection string in `.mcp.json`:

```json
"postgresql://username:password@localhost:5432/travel_agency_db"
```

Replace:
- `username`: Your PostgreSQL username (default: postgres)
- `password`: Your PostgreSQL password
- `localhost`: Database host (keep as localhost for local development)
- `5432`: PostgreSQL port (default)
- `travel_agency_db`: Database name for this project

## Create the Database

After PostgreSQL is installed, create the database:

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create the database
CREATE DATABASE travel_agency_db;

-- Create a dedicated user (optional but recommended)
CREATE USER travel_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE travel_agency_db TO travel_user;

-- Exit
\q
```

## Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://travel_user:your_secure_password@localhost:5432/travel_agency_db
```

## Verify Connection

Test the connection using the MCP server:
```bash
# In the project directory
npx @modelcontextprotocol/server-postgres "postgresql://username:password@localhost:5432/travel_agency_db"
```

## Troubleshooting

### Connection Refused
- Ensure PostgreSQL service is running
- Check if port 5432 is not blocked by firewall
- Verify the connection string is correct

### Authentication Failed
- Double-check username and password
- Ensure the user has privileges for the database
- Check pg_hba.conf for authentication settings

### Database Does Not Exist
- Create the database using the commands above
- Ensure you're connecting to the right database name