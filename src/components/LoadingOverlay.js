import React, { useContext } from 'react';
import { CircularProgress, Typography, Box } from '@mui/material';
import { DataContext } from '../contexts/DataContext';

const LoadingOverlay = ({ message }) => {
  return (
      <Box 
        sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
        }}
      >
        <CircularProgress size={60} thickness={4} />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {message}
        </Typography>
      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        Lütfen bekleyin...
      </Typography>
      </Box>
  );
};

export default LoadingOverlay; 