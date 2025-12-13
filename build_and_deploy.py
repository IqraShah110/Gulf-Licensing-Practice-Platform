"""
Script to build React app and copy to Flask static folder
Run this after making changes to the React frontend
"""
import os
import shutil
import subprocess
import sys

def build_react_app():
    """Build the React application"""
    print("Building React app...")
    os.chdir('frontend')
    try:
        result = subprocess.run(['npm', 'run', 'build'], check=True, capture_output=True, text=True)
        print("React app built successfully!")
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error building React app: {e.stderr}")
        return False
    finally:
        os.chdir('..')

def copy_build_to_static():
    """Copy React build to Flask static folder"""
    print("Copying build files...")
    build_dir = 'frontend/build'
    static_dir = 'static'
    
    if not os.path.exists(build_dir):
        print(f"Build directory {build_dir} does not exist!")
        return False
    
    # Copy static files
    if os.path.exists(os.path.join(build_dir, 'static')):
        static_dest = os.path.join(static_dir, 'react')
        if os.path.exists(static_dest):
            shutil.rmtree(static_dest)
        shutil.copytree(os.path.join(build_dir, 'static'), static_dest)
        print(f"Copied static files to {static_dest}")
    
    # Copy index.html
    if os.path.exists(os.path.join(build_dir, 'index.html')):
        shutil.copy(
            os.path.join(build_dir, 'index.html'),
            os.path.join(static_dir, 'index.html')
        )
        print("Copied index.html to static folder")
    
    return True

if __name__ == '__main__':
    print("=" * 50)
    print("Building and deploying React frontend")
    print("=" * 50)
    
    if build_react_app():
        if copy_build_to_static():
            print("\n✅ Deployment completed successfully!")
            print("\nYou can now run the Flask app and the React frontend will be served.")
        else:
            print("\n❌ Failed to copy build files")
            sys.exit(1)
    else:
        print("\n❌ Failed to build React app")
        sys.exit(1)

