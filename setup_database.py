#!/usr/bin/env python3
"""
Database Setup Script for Gulf Licensing Preparation
This script creates all required database tables automatically.
"""

import os
from dotenv import load_dotenv
from db_handler import ensure_all_tables_exist, get_mcq_statistics

# Load environment variables
load_dotenv()

def main():
    """Set up the database with all required tables"""
    print("🚀 Setting up Gulf Licensing Preparation Database")
    print("=" * 60)
    
    try:
        # Create all required tables
        print("\n📋 Creating database tables...")
        ensure_all_tables_exist()
        
        print("\n✅ Database setup completed successfully!")
        print("\n📊 Current database statistics:")
        get_mcq_statistics()
        
        print("\n🎉 You can now run main.py to process PDF files!")
        
    except Exception as e:
        print(f"\n❌ Error setting up database: {e}")
        print("\nPlease check your database connection settings in .env file")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main()) 