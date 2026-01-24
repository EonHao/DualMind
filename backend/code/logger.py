import sys
import os
from datetime import datetime
from pathlib import Path

current_file = Path(__file__).resolve()
log_dir = current_file.parent / 'logs' 

class SimulationLogger:
    """Simulation logger, outputs to both console and file."""
    
    def __init__(self, log_dir=log_dir, log_file_prefix="simulation"):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Create a log file name with a timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = self.log_dir / f"{log_file_prefix}_{timestamp}.log"
        
        # Open the log file
        self.file_handle = open(self.log_file, 'w', encoding='utf-8')
        
        # Save original stdout
        self.original_stdout = sys.stdout
        self.original_stderr = sys.stderr
        
        print(f"Log file created: {self.log_file}")
    
    def write(self, text):
        """Write to both console and file simultaneously"""
        if text.strip():  # Only log non-empty text
            # Write to file
            self.file_handle.write(text)
            self.file_handle.flush()  # Flush to file immediately
            
            # Write to console
            self.original_stdout.write(text)
            self.original_stdout.flush()
    
    def flush(self):
        """Flush the buffer"""
        self.file_handle.flush()
        self.original_stdout.flush()
    
    def close(self):
        """Close the logger"""
        if hasattr(self, 'file_handle') and self.file_handle:
            self.file_handle.close()
    
    def __enter__(self):
        """Context manager entry"""
        sys.stdout = self
        sys.stderr = self
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        sys.stdout = self.original_stdout
        sys.stderr = self.original_stderr
        self.close()

# Global logger instance
_logger_instance = None

def setup_logging(log_dir="logs", log_file_prefix="simulation"):
    """Set up global logging"""
    global _logger_instance
    if _logger_instance is None:
        _logger_instance = SimulationLogger(log_dir, log_file_prefix)
    return _logger_instance

def get_logger():
    """Get the logger instance"""
    return _logger_instance

def log_message(message):
    """Log a message (for compatibility with old code)"""
    if _logger_instance:
        _logger_instance.write(message + '\n')
    else:
        print(message)