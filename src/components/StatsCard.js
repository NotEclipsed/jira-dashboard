import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

function StatsCard({ title, value, subtitle, color = 'primary', icon }) {
  const getColor = (colorName) => {
    switch (colorName) {
      case 'primary':
        return '#0052CC';
      case 'secondary':
        return '#36B37E';
      case 'warning':
        return '#FF8B00';
      case 'info':
        return '#0065FF';
      case 'error':
        return '#FF5630';
      default:
        return '#0052CC';
    }
  };

  return (
    <Card
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${getColor(color)}15 0%, ${getColor(color)}05 100%)`,
        border: `1px solid ${getColor(color)}25`,
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
        transition: 'all 0.2s ease-in-out'
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography 
              variant="h4" 
              component="div"
              sx={{ 
                fontWeight: 700,
                color: getColor(color),
                mb: 0.5
              }}
            >
              {value}
            </Typography>
            <Typography 
              variant="h6" 
              component="div"
              sx={{ 
                fontWeight: 500,
                color: 'text.primary',
                mb: 0.5
              }}
            >
              {title}
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary"
            >
              {subtitle}
            </Typography>
          </Box>
          {icon && (
            <Box 
              sx={{ 
                color: getColor(color),
                opacity: 0.7,
                fontSize: '2rem',
                ml: 2
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

export default StatsCard;
