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
        # Print connection parameters for debugging (excluding password)
        print("\nDEBUG - Attempting database connection with:")
        print(f"Host: {os.getenv('DB_HOST', 'localhost')}")
        print(f"Database: {os.getenv('DB_NAME', 'mcq_db')}")
        print(f"User: {os.getenv('DB_USER', 'postgres')}")
        print(f"Port: {os.getenv('DB_PORT', '5432')}")
        
        conn = psycopg2.connect(
            host=os.getenv("DB_HOST", "localhost"),
            dbname=os.getenv("DB_NAME", "mcq_db"),
            user=os.getenv("DB_USER", "postgres"),
            password=os.getenv("DB_PASSWORD", "yourpassword"),
            port=os.getenv("DB_PORT", "5432")
        )
        print("✅ Database connection successful")
        return conn
    except psycopg2.Error as e:
        print(f"❌ Database connection error: {e}")
        # If database doesn't exist, try to create it
        if isinstance(e, psycopg2.OperationalError) and "does not exist" in str(e):
            try:
                # Connect to default postgres database
                conn = psycopg2.connect(
                    host=os.getenv("DB_HOST", "localhost"),
                    dbname="postgres",
                    user=os.getenv("DB_USER", "postgres"),
                    password=os.getenv("DB_PASSWORD", "yourpassword"),
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
    """Initialize the database and create necessary tables"""
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

                # Create MCQs table
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS mcqs (
                        id SERIAL PRIMARY KEY,
                        question_text TEXT NOT NULL,
                        option_a TEXT,
                        option_b TEXT,
                        option_c TEXT,
                        option_d TEXT,
                        correct_answer CHAR(1) NOT NULL,
                        subject medical_subject NOT NULL,
                        source VARCHAR(100),
                        explanation TEXT,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                print("✅ Database schema ready")

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
                    INSERT INTO March25_MCQs (
                        question_number, question_text, normalized_question,
                        option_a, option_b, option_c, option_d,
                        correct_answer, explanation, subject, source_file, exam_date
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (normalized_question) 
                    DO UPDATE SET
                        appearance_count = March25_MCQs.appearance_count + 1,
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
                
                # Record this appearance in question_history
                if exam_date:
                    cur.execute(
                        """
                        INSERT INTO question_history (mcq_id, exam_date, source_file)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (mcq_id, exam_date) DO NOTHING;
                        """,
                        (mcq_id, exam_date, source_file)
                    )
                
            conn.commit()
        print(f"✅ {'Updated' if count > 1 else 'Inserted'} MCQ {mcq['question_number']} (ID: {mcq_id}, Appearances: {count})")
        return mcq_id
    except Exception as e:
        print(f"❌ Error inserting MCQ {mcq['question_number']}: {e}")
        return None

def batch_insert_mcqs(mcqs, source_file=None):
    """Insert multiple MCQs in a batch"""
    successful = 0
    failed = 0
    
    for mcq in mcqs:
        try:
            if insert_mcq(mcq, source_file):
                successful += 1
            else:
                failed += 1
        except Exception as e:
            print(f"❌ Error in batch insert: {e}")
            failed += 1
    
    print(f"\nBatch Insert Summary:")
    print(f"✅ Successfully inserted/updated: {successful}")
    print(f"❌ Failed: {failed}")
    return successful, failed

def get_mcqs_by_subject(subject):
    """Retrieve MCQs for a specific subject"""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT 
                        id,
                        question_number, question_text, 
                        option_a, option_b, option_c, option_d,
                        correct_answer, source_file, appearance_count,
                        exam_date, explanation
                    FROM March25_MCQs 
                    WHERE subject = %s
                    ORDER BY 
                        CASE 
                            WHEN question_number ~ '^[0-9]+' THEN CAST(regexp_replace(question_number, '[^0-9].*$', '') AS INTEGER)
                            ELSE 999999
                        END,
                        question_number
                    """,
                    (subject,)
                )
                rows = cur.fetchall()
                
                mcqs = []
                for idx, row in enumerate(rows, 1):  # Start enumeration from 1
                    # Only include non-null options
                    options = {}
                    if row[3]: options['A'] = row[3]
                    if row[4]: options['B'] = row[4]
                    if row[5]: options['C'] = row[5]
                    if row[6]: options['D'] = row[6]
                    
                    mcqs.append({
                        'id': row[0],
                        'display_number': idx,  # Sequential number for display
                        'question_text': row[2],
                        'options': options,
                        'correct_answer': row[7],
                        'source_file': row[8],
                        'exam_date': row[10].strftime('%B %Y') if row[10] else None,
                        'explanation': row[11]  # Add explanation to the returned data
                    })
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
                    FROM March25_MCQs 
                    WHERE exam_date = %s
                    ORDER BY 
                        subject,
                        CASE 
                            WHEN question_number ~ '^[0-9]+' THEN CAST(regexp_replace(question_number, '[^0-9].*$', '') AS INTEGER)
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
                    FROM March25_MCQs 
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
                    FROM March25_MCQs
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

if __name__ == "__main__":
    # Initialize the database when the script is run directly
    initialize_database()
    print("\nChecking current MCQ statistics...")
    get_mcq_statistics()

