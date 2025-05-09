import React, { useEffect } from 'react';
import { 
  FormGroup, 
  FormControlLabel, 
  Checkbox, 
  Typography, 
  Divider,
  Tooltip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const SensorLayerControlFixed = ({ 
  availableSensors, 
  activeSensors, 
  onToggleSensor,
  sensorStatistics
}) => {
  
  // Debug active sensors on mount and when they change
  useEffect(() => {
    console.log("SensorLayerControl - Active sensors:", activeSensors);
  }, [activeSensors]);
  
  // Helper function to explicitly handle PM2.5
  const handleToggle = (sensorId) => {
    console.log(`Explicit toggle for ${sensorId}, current state:`, activeSensors.includes(sensorId));
    onToggleSensor(sensorId);
  };
  
  return (
    <div className="control-panel">
      <Typography variant="h6" className="layer-heading">
        Sensor Data Layers
      </Typography>
      <Divider sx={{ mb: 2 }} />
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Air Quality</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {/* Explicit handling for PM2.5 */}
            {availableSensors
              .filter(sensor => sensor.id === 'PM2.5_ug_m3')
              .map(sensor => {
                const isChecked = activeSensors.includes(sensor.id);
                return (
                  <div key={sensor.id} className="layer-toggle">
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={isChecked}
                          onChange={() => handleToggle(sensor.id)}
                          color="primary"
                        />
                      }
                      label={sensor.name}
                    />
                    <Tooltip 
                      title={
                        sensorStatistics[sensor.id] 
                          ? `Range: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                          : `No data available for ${sensor.name}`
                      }
                    >
                      <IconButton size="small">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </div>
                );
              })
            }
            
            {/* Other air quality sensors */}
            {availableSensors
              .filter(sensor => ['PM10_ug_m3', 'CO_ppm', 'NO2_ppb', 'SO2_ppb', 'O3_ppb', 'VOC_ppb'].includes(sensor.id))
              .map(sensor => (
                <div key={sensor.id} className="layer-toggle">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={activeSensors.includes(sensor.id)}
                        onChange={() => onToggleSensor(sensor.id)}
                        color="primary"
                      />
                    }
                    label={sensor.name}
                  />
                  <Tooltip 
                    title={
                      sensorStatistics[sensor.id] 
                        ? `Range: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                        : `No data available for ${sensor.name}`
                    }
                  >
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))
            }
          </FormGroup>
        </AccordionDetails>
      </Accordion>
      
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Environmental Conditions</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {availableSensors
              .filter(sensor => ['Temperature_C', 'Relative_Humidity_Percent', 'Sound_Level_dB', 'Light_Level_lux'].includes(sensor.id))
              .map(sensor => (
                <div key={sensor.id} className="layer-toggle">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={activeSensors.includes(sensor.id)}
                        onChange={() => onToggleSensor(sensor.id)}
                        color="primary"
                      />
                    }
                    label={sensor.name}
                  />
                  <Tooltip 
                    title={
                      sensorStatistics[sensor.id] 
                        ? `Range: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                        : `No data available for ${sensor.name}`
                    }
                  >
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))
            }
          </FormGroup>
        </AccordionDetails>
      </Accordion>
      
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">Other Measurements</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <FormGroup>
            {availableSensors
              .filter(sensor => ['Vibration_g', 'Radiation_uSv_h'].includes(sensor.id))
              .map(sensor => (
                <div key={sensor.id} className="layer-toggle">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={activeSensors.includes(sensor.id)}
                        onChange={() => onToggleSensor(sensor.id)}
                        color="primary"
                      />
                    }
                    label={sensor.name}
                  />
                  <Tooltip 
                    title={
                      sensorStatistics[sensor.id] 
                        ? `Range: ${sensorStatistics[sensor.id].overall.min.toFixed(1)} - ${sensorStatistics[sensor.id].overall.max.toFixed(1)} ${sensor.unit}` 
                        : `No data available for ${sensor.name}`
                    }
                  >
                    <IconButton size="small">
                      <InfoIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </div>
              ))
            }
          </FormGroup>
        </AccordionDetails>
      </Accordion>
      
      <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.secondary' }}>
        Select layers to visualize sensor data. Areas with anomalous readings are highlighted with more intense colors.
      </Typography>
    </div>
  );
};

export default SensorLayerControlFixed; 