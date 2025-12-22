import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv
import hashlib
import string

load_dotenv()

def get_connection():
    """Get database connection using environment variables"""
    try:
        db_url = os.getenv("DB_URL") or os.getenv("DATABASE_URL")

        if db_url:
            print("\nDEBUG - Attempting database connection using DB_URL")
            conn = psycopg2.connect(db_url)
        else:
            # Print connection parameters for debugging (excluding password)
            print("\nDEBUG - Attempting database connection with:")
            print(f"Host: {os.getenv('DB_HOST', 'localhost')}")
            print(f"Database: {os.getenv('DB_NAME', 'mcq_db')}")
            print(f"User: {os.getenv('DB_USER', 'postgres')}")
            print(f"Port: {os.getenv('DB_PORT', '5432')}")
            print(f"SSL Mode: {os.getenv('DB_SSLMODE', 'require')}")
            
            # Require DB_PASSWORD - no default fallback for security
            db_password = os.getenv("DB_PASSWORD")
            if not db_password:
                raise ValueError("DB_PASSWORD environment variable is required")
            
            conn = psycopg2.connect(
                host=os.getenv("DB_HOST", "localhost"),
                dbname=os.getenv("DB_NAME", "mcq_db"),
                user=os.getenv("DB_USER", "postgres"),
                password=db_password,
                port=os.getenv("DB_PORT", "5432"),
                sslmode=os.getenv("DB_SSLMODE", "require")
            )
        print("✅ Database connection successful")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection error: {e}")
        # If database doesn't exist, try to create it
        if isinstance(e, psycopg2.OperationalError) and "does not exist" in str(e):
            try:
                # Connect to default postgres database
                db_password = os.getenv("DB_PASSWORD")
                if not db_password:
                    raise ValueError("DB_PASSWORD environment variable is required")
                
                conn = psycopg2.connect(
                    host=os.getenv("DB_HOST", "localhost"),
                    dbname="postgres",
                    user=os.getenv("DB_USER", "postgres"),
                    password=db_password,
                    port=os.getenv("DB_PORT", "5432")
                )
                conn.autocommit = True
                with conn.cursor() as cur:
                    cur.execute(f"CREATE DATABASE {os.getenv('DB_NAME', 'mcq_db')}")
                conn.close()
                print(f"✅ Created database {os.getenv('DB_NAME', 'mcq_db')}")
                # Try connecting again
                return get_connection()
            except Exception as create_error:
                print(f"❌ Error creating database: {create_error}")
                raise
        raise

def normalize_question(question):
    """Normalize question text to prevent duplicates while preserving content"""
    if not question:
        return None
        
    # Convert to lowercase
    cleaned = question.lower()
    
    # Replace common variations
    cleaned = cleaned.replace('\\n', ' ')
    cleaned = cleaned.replace('\n', ' ')
    
    # Remove all punctuation except numbers
    cleaned = ''.join(c for c in cleaned if c.isalnum() or c.isspace())
    
    # Normalize whitespace
    cleaned = ' '.join(cleaned.split())
    
    # Remove common prefixes that might vary
    prefixes_to_remove = [
        "a patient with", "patient with", "a case of", 
        "in a patient with", "a", "an", "the"
    ]
    for prefix in prefixes_to_remove:
        if cleaned.startswith(prefix + " "):
            cleaned = cleaned[len(prefix) + 1:]
    
    # Return MD5 hash of the cleaned question
    return hashlib.md5(cleaned.encode()).hexdigest()

def initialize_database():
    """Initialize the database and create necessary tables - MINIMAL VERSION"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Create users table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        email VARCHAR(100) UNIQUE NOT NULL,
                        password_hash VARCHAR(255) NOT NULL,
                        is_verified BOOLEAN DEFAULT TRUE,
                        google_id VARCHAR(64) UNIQUE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("✅ Users table ready")

                # Create medical_subject enum type if it doesn't exist
                cur.execute("""
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_subject') THEN
                            CREATE TYPE medical_subject AS ENUM ('Surgery', 'Medicine', 'Gynae', 'Paeds');
                        END IF;
                    END $$;
                """)
                print("✅ Medical subject enum type ready")

                # Create march25_mcqs table (the main table)
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS march25_mcqs (
                        id SERIAL PRIMARY KEY,
                        question_number VARCHAR(20),
                        question_text TEXT NOT NULL,
                        normalized_question VARCHAR(32) UNIQUE,
                        option_a TEXT,
                        option_b TEXT,
                        option_c TEXT,
                        option_d TEXT,
                        correct_answer CHAR(1) NOT NULL,
                        explanation TEXT,
                        subject medical_subject NOT NULL,
                        source_file VARCHAR(100),
                        exam_date DATE,
                        appearance_count INTEGER DEFAULT 1,
                        last_appearance DATE DEFAULT CURRENT_DATE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("✅ march25_mcqs table ready")

                print("✅ Minimal database setup completed (users + march25_mcqs only)")

    except Exception as e:
        print(f"Error initializing database: {e}")
        raise

def insert_mcq(mcq, source_file=None):
    """Insert a single MCQ into the database"""
    try:
        # Clean up the text by replacing \n with spaces and removing multiple spaces
        def clean_text(text):
            if text:
                # Replace literal '\n' string with actual newline
                text = text.replace('\\n', '\n')
                # Replace newlines and multiple spaces with single space
                text = ' '.join(text.split())
            return text
        
        normalized = normalize_question(clean_text(mcq['question_text']))
        
        # Get options with explicit None for null values and clean them
        options = mcq['options']
        option_a = clean_text(options.get('A')) if options.get('A') != 'null' else None
        option_b = clean_text(options.get('B')) if options.get('B') != 'null' else None
        option_c = clean_text(options.get('C')) if options.get('C') != 'null' else None
        option_d = clean_text(options.get('D')) if options.get('D') != 'null' else None
        
        # Clean question text
        question_text = clean_text(mcq['question_text'])
        
        # Handle unknown subject by defaulting to Medicine
        subject = mcq.get('subject')
        if subject not in ('Surgery', 'Medicine', 'Gynae', 'Paeds'):
            print(f"⚠️ Unknown subject '{subject}' for MCQ {mcq['question_number']}, defaulting to Medicine")
            subject = 'Medicine'
        
        # Extract exam date from source file if possible (format: Month YYYY.pdf)
        exam_date = None
        if source_file:
            try:
                from datetime import datetime
                filename = source_file.replace('.pdf', '')
                exam_date = datetime.strptime(filename, '%B %Y').date()
            except:
                print(f"⚠️ Could not parse exam date from filename: {source_file}")
        
        with get_connection() as conn:
            with conn.cursor() as cur:
                # Try to insert or update the MCQ
                cur.execute(
                    """
                    INSERT INTO march25_mcqs (
                        question_number, question_text, normalized_question,
                        option_a, option_b, option_c, option_d,
                        correct_answer, explanation, subject, source_file, exam_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (normalized_question) 
                    DO UPDATE SET
                        appearance_count = march25_mcqs.appearance_count + 1,
                        last_appearance = CURRENT_DATE,
                        explanation = EXCLUDED.explanation
                    RETURNING id, appearance_count;
                    """,
                    (
                        mcq['question_number'],
                        question_text,
                        normalized,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        mcq['correct_answer'],
                        mcq.get('explanation'),
                        subject,
                        source_file,
                        exam_date
                    )
                )
                mcq_id, count = cur.fetchone()
                
            conn.commit()
        print(f"✅ {'Updated' if count > 1 else 'Inserted'} MCQ {mcq['question_number']} (ID: {mcq_id}, Appearances: {count})")
        return mcq_id
    except Exception as e:
        print(f"❌ Error inserting MCQ {mcq['question_number']}: {e}")
        return None

def batch_insert_mcqs(mcqs, source_file=None):
    """Insert multiple MCQs in a batch with detailed verification"""
    successful = 0
    failed = 0
    failed_mcqs = []
    
    print(f"\n💾 Starting batch insert of {len(mcqs)} MCQs...")
    
    for i, mcq in enumerate(mcqs, 1):
        try:
            # Validate MCQ data before insertion
            if not validate_mcq_data(mcq):
                print(f"❌ [{i}/{len(mcqs)}] Invalid MCQ data for Q{mcq.get('question_number', 'Unknown')}")
                failed += 1
                failed_mcqs.append(f"Q{mcq.get('question_number', 'Unknown')}: Invalid data")
                continue
            
            mcq_id = insert_mcq(mcq, source_file)
            if mcq_id:
                successful += 1
                print(f"✅ [{i}/{len(mcqs)}] Saved Q{mcq['question_number']} (ID: {mcq_id})")
            else:
                failed += 1
                failed_mcqs.append(f"Q{mcq['question_number']}: Insert failed")
                print(f"❌ [{i}/{len(mcqs)}] Failed to save Q{mcq['question_number']}")
                
        except Exception as e:
            print(f"❌ [{i}/{len(mcqs)}] Error saving Q{mcq.get('question_number', 'Unknown')}: {e}")
            failed += 1
            failed_mcqs.append(f"Q{mcq.get('question_number', 'Unknown')}: {str(e)}")
    
    print(f"\n📊 Batch Insert Summary:")
    print(f"✅ Successfully inserted/updated: {successful}")
    print(f"❌ Failed: {failed}")
    
    if failed_mcqs:
        print(f"\n❌ Failed MCQs:")
        for failed_mcq in failed_mcqs[:5]:  # Show first 5 failures
            print(f"  - {failed_mcq}")
        if len(failed_mcqs) > 5:
            print(f"  ... and {len(failed_mcqs) - 5} more")
    
    return successful, failed

def validate_mcq_data(mcq):
    """Validate MCQ data before insertion"""
    required_fields = ['question_text', 'correct_answer', 'options']
    
    # Check required fields
    for field in required_fields:
        if field not in mcq or not mcq[field]:
            print(f"⚠️ Missing required field: {field}")
            return False
    
    # Check question text
    if len(mcq['question_text'].strip()) < 10:
        print(f"⚠️ Question text too short: {len(mcq['question_text'])} chars")
        return False
    
    # Check correct answer
    if mcq['correct_answer'] not in mcq['options']:
        print(f"⚠️ Correct answer '{mcq['correct_answer']}' not in options")
        return False
    
    # Check options
    valid_options = ['A', 'B', 'C', 'D']
    for opt in valid_options:
        if opt in mcq['options'] and mcq['options'][opt]:
            if len(mcq['options'][opt].strip()) < 2:
                print(f"⚠️ Option {opt} too short")
                return False
    
    return True

def get_mcqs_by_subject(subject):
    """Retrieve MCQs for a specific subject from ALL month tables (e.g., january25_mcqs ... december25_mcqs).
    STRICTLY filters by subject - only returns MCQs matching the exact subject name."""
    
    # Validate subject parameter
    valid_subjects = ['Surgery', 'Medicine', 'Gynae', 'Paeds']
    if subject not in valid_subjects:
        print(f"❌ Invalid subject '{subject}'. Must be one of: {valid_subjects}")
        return []
    
    # List of month tables to search across; add/remove here as needed
    month_tables = [
        'january25_mcqs',
        'february25_mcqs',
        'march25_mcqs',
        'april25_mcqs',
        'may25_mcqs',
        'june25_mcqs',
        'july25_mcqs',
        'august25_mcqs',
        'september25_mcqs',
        'october25_mcqs',
        'november25_mcqs',
        'december25_mcqs',
    ]

    try:
        all_rows = []
        with get_connection() as conn:
            with conn.cursor() as cur:
                for table in month_tables:
                    try:
                        # STRICT filtering: WHERE subject = %s ensures only exact matches
                        query = sql.SQL("""
                            SELECT 
                                id,
                                question_number,
                                question_text, 
                                option_a,
                                option_b,
                                option_c,
                                option_d,
                                correct_answer,
                                subject,
                                explanation
                            FROM {table}
                            WHERE subject = %s
                            ORDER BY 
                                CASE 
                                    WHEN question_number ~ '^[0-9]+' THEN CAST(regexp_replace(question_number, '[^0-9].*$', '') AS BIGINT)
                                    ELSE 999999
                                END,
                                question_number
                        """).format(table=sql.Identifier(table))
                        cur.execute(query, (subject,))
                        rows = cur.fetchall()
                        
                        # Verify each row's subject matches (double-check)
                        for row in rows:
                            row_subject = row[8]  # subject is at index 8
                            if row_subject != subject:
                                print(f"⚠️ WARNING: Found MCQ in {table} with subject '{row_subject}' when querying for '{subject}'. Skipping.")
                                continue
                            all_rows.append(row)
                    except Exception as te:
                        # Table might not exist yet or have different schema; skip but log
                        print(f"⚠️ Skipping table {table} for subject {subject}: {te}")
        
        # Build unified MCQ list with sequential display_number across all months
        # Final verification: ensure all MCQs are for the requested subject
        mcqs = []
        for idx, row in enumerate(all_rows, 1):
            # Final check: verify subject matches (row[8] is the subject column)
            row_subject = row[8]
            if row_subject != subject:
                print(f"⚠️ ERROR: MCQ {row[0]} has subject '{row_subject}' but expected '{subject}'. Skipping.")
                continue
                
            options = {}
            if row[3]: options['A'] = row[3]
            if row[4]: options['B'] = row[4]
            if row[5]: options['C'] = row[5]
            if row[6]: options['D'] = row[6]
            
            mcqs.append({
                'id': row[0],
                'display_number': idx,
                'question_text': row[2],
                'options': options,
                'correct_answer': row[7],
                'subject': row_subject,  # Include subject in response for verification
                # We don't have reliable per-table exam_date/source_file for all months,
                # so keep them None for now to maintain API shape.
                'source_file': None,
                'exam_date': None,
                'explanation': row[9]
            })
        
        print(f"✅ Retrieved {len(mcqs)} MCQs for subject '{subject}' from {len(month_tables)} tables")
        return mcqs
    except Exception as e:
        print(f"❌ Error retrieving MCQs for subject {subject}: {e}")
        return []

def get_mcqs_by_exam_date(exam_date):
    """Retrieve all MCQs for a specific exam date"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 
                        question_number, question_text, 
                        option_a, option_b, option_c, option_d,
                        correct_answer, source_file, appearance_count,
                        subject, explanation
                    FROM march25_mcqs 
                    WHERE exam_date = %s
                    ORDER BY 
                        subject,
                        CASE 
                            WHEN question_number ~ '^[0-9]+' THEN CAST(regexp_replace(question_number, '[^0-9].*$', '') AS BIGINT)
                            ELSE 999999
                        END,
                        question_number
                    """,
                    (exam_date,)
                )
                rows = cur.fetchall()
                
                mcqs = []
                current_subject = None
                subject_counter = 0
                
                for row in rows:
                    # Reset counter when subject changes
                    if current_subject != row[9]:
                        current_subject = row[9]
                        subject_counter = 1
                    
                    # Only include non-null options
                    options = {}
                    if row[2]: options['A'] = row[2]
                    if row[3]: options['B'] = row[3]
                    if row[4]: options['C'] = row[4]
                    if row[5]: options['D'] = row[5]
                    
                    mcqs.append({
                        'display_number': subject_counter,  # Sequential number for display
                        'question_text': row[1],
                        'options': options,
                        'correct_answer': row[6],
                        'source_file': row[7],
                        'subject': row[9],
                        'explanation': row[10]  # Add explanation to the returned data
                    })
                    subject_counter += 1
                return mcqs
    except Exception as e:
        print(f"❌ Error retrieving MCQs for exam date {exam_date}: {e}")
        return []

def get_mcqs_by_exam_table(table_name):
    """Retrieve all MCQs for a given month table (e.g., march25_mcqs)"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                query = sql.SQL("""
                    SELECT 
                        id,
                        question_number,
                        question_text,
                        option_a,
                        option_b,
                        option_c,
                        option_d,
                        correct_answer,
                        subject,
                        explanation
                    FROM {table}
                    ORDER BY 
                        subject,
                        CASE 
                            WHEN question_number ~ '^[0-9]+' THEN CAST(regexp_replace(question_number, '[^0-9].*$', '') AS BIGINT)
                            ELSE 999999
                        END,
                        question_number
                """).format(table=sql.Identifier(table_name))
                cur.execute(query)
                rows = cur.fetchall()
                
                mcqs = []
                for row in rows:
                    options = {}
                    if row[3]: options['A'] = row[3]
                    if row[4]: options['B'] = row[4]
                    if row[5]: options['C'] = row[5]
                    if row[6]: options['D'] = row[6]
                    
                    mcqs.append({
                        'id': row[0],
                        'question_number': row[1],
                        'question_text': row[2],
                        'options': options,
                        'correct_answer': row[7],
                        'subject': row[8],
                        'explanation': row[9]
                    })
                return mcqs
    except Exception as e:
        print(f"❌ Error retrieving MCQs from table {table_name}: {e}")
        return []

def get_mcq_statistics():
    """Get statistics about MCQs in the database"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                print("\nMCQ Database Statistics:")
                print("-" * 50)
                
                # Get stats by subject
                cur.execute("""
                    SELECT 
                        subject,
                        COUNT(*) as total_mcqs,
                        COUNT(DISTINCT source_file) as unique_sources,
                        MIN(exam_date) as earliest_date,
                        MAX(exam_date) as latest_date,
                        SUM(CASE WHEN appearance_count > 1 THEN 1 ELSE 0 END) as repeated_questions
                    FROM march25_mcqs  
                    GROUP BY subject
                    ORDER BY subject;
                """)
                
                for row in cur.fetchall():
                    print(f"Subject: {row[0]}")
                    print(f"Total MCQs: {row[1]}")
                    print(f"Unique Sources: {row[2]}")
                    if row[3] and row[4]:
                        print(f"Date Range: {row[3].strftime('%Y-%m-%d')} to {row[4].strftime('%Y-%m-%d')}")
                    print(f"Repeated Questions: {row[5]}")
                    print("-" * 50)
                
                # Get most repeated questions
                cur.execute("""
                    SELECT question_number, appearance_count
                    FROM march25_mcqs 
                    WHERE appearance_count > 1
                    ORDER BY appearance_count DESC
                    LIMIT 5;
                """)
                
                repeated = cur.fetchall()
                if repeated:
                    print("\nMost Repeated Questions:")
                    for row in repeated:
                        print(f"Question {row[0]}: {row[1]} appearances")
                
    except Exception as e:
        print(f"Error getting MCQ statistics: {e}")

def ensure_all_tables_exist():
    """Ensure all required tables exist - MINIMAL VERSION"""
    try:
        # Initialize main database tables only
        initialize_database()
        print("✅ Minimal database tables are ready (users + march25_mcqs only)")
    except Exception as e:
        print(f"Error ensuring all tables exist: {e}")
        raise

if __name__ == "__main__":
    # Initialize the database when the script is run directly
    ensure_all_tables_exist()
    print("\nChecking current MCQ statistics...")
    get_mcq_statistics()