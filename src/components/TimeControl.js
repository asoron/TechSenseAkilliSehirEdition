import React, { useState, useEffect, useRef } from 'react';
import { Slider, Typography, Box, Paper, TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import EditIcon from '@mui/icons-material/Edit';
import { formatHourString, formatTimeString, timeToSliderValue, sliderValueToTime } from '../utils/dataUtils';

const TimeControl = ({ selectedHour, selectedMinute = 0, onHourChange, onMinuteChange, isMobile = false }) => {
  // Convert hour and minute to a single slider value
  const [sliderValue, setSliderValue] = useState(timeToSliderValue(selectedHour, selectedMinute));
  // State for manual time input
  const [isEditing, setIsEditing] = useState(false);
  const [timeInput, setTimeInput] = useState(formatTimeString(selectedHour, selectedMinute));
  const timeInputRef = useRef(null);

  // Kaydırıcı için işaretleri formatla - mobil cihazlarda daha az işaret göster
  const marks = isMobile 
    ? [
        { value: 0, label: '00:00' },
        { value: 720, label: '12:00' },
        { value: 1380, label: '23:00' }
      ]
    : [
        { value: 0, label: '00:00' },
        { value: 360, label: '06:00' },
        { value: 720, label: '12:00' },
        { value: 1080, label: '18:00' },
        { value: 1380, label: '23:00' }
      ];

  // Update slider value when hour or minute changes from props
  useEffect(() => {
    setSliderValue(timeToSliderValue(selectedHour, selectedMinute));
    setTimeInput(formatTimeString(selectedHour, selectedMinute));
  }, [selectedHour, selectedMinute]);

  // Handle slider change
  const handleSliderChange = (event, newValue) => {
    setSliderValue(newValue);
    const { hour, minute } = sliderValueToTime(newValue);
    
    // Only update if the values have changed
    if (hour !== selectedHour) {
      onHourChange(hour);
    }
    
    if (onMinuteChange && minute !== selectedMinute) {
      onMinuteChange(minute);
    }
  };

  // Handle time input change
  const handleTimeInputChange = (e) => {
    setTimeInput(e.target.value);
  };

  // Parse and validate time input
  const handleTimeInputBlur = () => {
    const timePattern = /^(\d{1,2}):(\d{1,2})$/;
    const match = timeInput.match(timePattern);

    if (match) {
      const hour = parseInt(match[1], 10);
      const minute = parseInt(match[2], 10);

      if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
        onHourChange(hour);
        if (onMinuteChange) {
          onMinuteChange(minute);
        }
      } else {
        // Reset to current values if invalid
        setTimeInput(formatTimeString(selectedHour, selectedMinute));
      }
    } else {
      // Reset to current values if format is invalid
      setTimeInput(formatTimeString(selectedHour, selectedMinute));
    }

    setIsEditing(false);
  };

  // Handle key press in input field
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleTimeInputBlur();
    } else if (e.key === 'Escape') {
      setTimeInput(formatTimeString(selectedHour, selectedMinute));
      setIsEditing(false);
    }
  };

  // Handle double click on time display to enter edit mode
  const handleDoubleClick = () => {
    setIsEditing(true);
    setTimeout(() => {
      if (timeInputRef.current) {
        timeInputRef.current.focus();
      }
    }, 100);
  };
  
  // Slider value label format function
  const formatSliderValueLabel = (value) => {
    const { hour, minute } = sliderValueToTime(value);
    return formatTimeString(hour, minute);
  };

  return (
    <Paper 
      elevation={3} 
      className="time-control" 
      sx={{ 
        position: 'absolute', 
        bottom: isMobile ? 10 : 20, 
        left: '50%', 
        transform: 'translateX(-50%)',
        padding: isMobile ? 1 : 2,
        borderRadius: 2,
        width: isMobile ? '95%' : 'auto',
        minWidth: isMobile ? 'auto' : 350,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        zIndex: 1000
      }}
    >
      <Box sx={{ width: '100%' }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          mb: isMobile ? 0.5 : 1,
          position: 'relative'
        }}>
          {isEditing ? (
            <TextField
              ref={timeInputRef}
              value={timeInput}
              onChange={handleTimeInputChange}
              onBlur={handleTimeInputBlur}
              onKeyDown={handleKeyPress}
              size="small"
              autoFocus
              placeholder="SS:DD"
              sx={{ 
                width: '80px', 
                '& input': { 
                  textAlign: 'center',
                  fontWeight: 'bold',
                  fontSize: isMobile ? '0.9rem' : '1.1rem'
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <AccessTimeIcon fontSize={isMobile ? "small" : "medium"} color="primary" />
                  </InputAdornment>
                ),
              }}
            />
          ) : (
            <Tooltip title={isMobile ? "" : "Zamanı değiştirmek için çift tıklayın"}>
              <Typography 
                variant={isMobile ? "body1" : "h6"} 
                sx={{ 
                  fontWeight: 'bold', 
                  color: '#1976d2',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}
                onDoubleClick={handleDoubleClick}
              >
                <AccessTimeIcon fontSize={isMobile ? "small" : "medium"} />
                {formatTimeString(selectedHour, selectedMinute)}
                <IconButton 
                  size="small" 
                  sx={{ ml: 0.5 }}
                  onClick={() => setIsEditing(true)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Typography>
            </Tooltip>
          )}
        </Box>
        
        <Slider
          value={sliderValue}
          onChange={handleSliderChange}
          min={0}
          max={1439} // 23 hours and 59 minutes (24*60 - 1)
          marks={marks}
          valueLabelDisplay={isMobile ? "off" : "auto"}
          valueLabelFormat={formatSliderValueLabel}
          aria-labelledby="time-slider"
          sx={{ 
            '& .MuiSlider-thumb': { 
              width: isMobile ? 12 : 16, 
              height: isMobile ? 12 : 16,
              '&:hover, &.Mui-focusVisible': {
                boxShadow: '0px 0px 0px 8px rgba(25, 118, 210, 0.16)'
              }
            },
            '& .MuiSlider-valueLabel': {
              backgroundColor: '#1976d2'
            },
            '& .MuiSlider-mark': {
              width: isMobile ? 2 : 4,
              height: isMobile ? 2 : 4
            },
            '& .MuiSlider-markLabel': {
              fontSize: isMobile ? '0.7rem' : '0.85rem'
            }
          }}
        />
        
        {!isMobile && (
          <Typography variant="caption" sx={{ display: 'block', mt: 1, textAlign: 'center', color: 'text.secondary' }}>
            Saati ve dakikayı değiştirmek için kaydırın veya zamanı çift tıklayarak düzenleyin
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

export default TimeControl; 