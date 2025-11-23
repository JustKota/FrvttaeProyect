import React, { useState } from 'react';
import '../styles.css';

function MoodRecommender({ onSelectSongs, sourceSongs = [] }) {
  const [selectedMood, setSelectedMood] = useState(null);
  const [currentSong, setCurrentSong] = useState(null);

  const getSongsByMood = (mood) => {
    return sourceSongs.filter(s => (s.mood || '').toLowerCase() === mood);
  };

  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    const moodSongs = getSongsByMood(mood);
    if (moodSongs.length > 0) {
      // Pasar las canciones filtradas pero no reemplazar el playlist completo
      onSelectSongs(moodSongs);
      setCurrentSong(moodSongs[0]);
    } else {
      // Si no hay canciones analizadas para ese mood, mostrar mensaje
      setCurrentSong(null);
      alert(`No hay canciones disponibles para el estado de ánimo "${mood}". Sube más canciones para obtener recomendaciones.`);
    }
  };

  return (
    <div className="mood-recommender">
      <h2>¿Cómo te sientes hoy?</h2>
      <p>Selecciona tu estado de ánimo para encontrar canciones que coincidan:</p>
      
      <div className="mood-buttons">
        <button 
          className={`mood-btn ${selectedMood === 'feliz' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('feliz')}
        >
          😊 Feliz ({getSongsByMood('feliz').length})
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'triste' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('triste')}
        >
          😢 Triste ({getSongsByMood('triste').length})
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'energico' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('energico')}
        >
          ⚡ Enérgico ({getSongsByMood('energico').length})
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'relajado' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('relajado')}
        >
          😌 Relajado ({getSongsByMood('relajado').length})
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'melancolico' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('melancolico')}
        >
          🌧️ Melancólico ({getSongsByMood('melancolico').length})
        </button>
      </div>

      {currentSong && (
        <div className="audio-player">
          <h4>Reproduciendo: {currentSong.title} - {currentSong.name}</h4>
          <p>Estado de ánimo detectado: <strong>{currentSong.mood}</strong></p>
        </div>
      )}

      {selectedMood && getSongsByMood(selectedMood).length > 0 && (
        <div className="recommendations">
          <h3>Canciones {selectedMood}s encontradas:</h3>
          <ul>
            {getSongsByMood(selectedMood).map((song, index) => (
              <li key={index}>
                <strong>{song.title}</strong> - {song.name}
                <span className="mood-tag"> ({song.mood})</span>
              </li>
            ))}
          </ul>
          <p><em>Nota: Tus canciones originales siguen en el playlist principal.</em></p>
        </div>
      )}
    </div>
  );
}

export default MoodRecommender;