import React from 'react';
import {
  Box,
  CircularProgress,
  Typography,
  Container
} from '@mui/material';

function LoadingScreen({ message = "Loading..." }) {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        <CircularProgress size={60} sx={{ mb: 3 }} />
        <Typography variant="h6" color="textSecondary">
          {message}
        </Typography>
      </Box>
    </Container>
  );
}

export default LoadingScreen;
