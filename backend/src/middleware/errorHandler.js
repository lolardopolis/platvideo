export function errorHandler(err, _req, res, _next) {
  console.error('Error:', err.message);
  
  if (err.name === 'MulterError') {
    res.status(400).json({ error: err.message });
    return;
  }
  
  res.status(500).json({ error: err.message || 'Internal server error' });
}
