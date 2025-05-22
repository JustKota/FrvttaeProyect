import React, { useState } from 'react';
import '../styles.css';

function MoodRecommender({ onSelectSongs }) {
  const [selectedMood, setSelectedMood] = useState(null);
  
  const moodRecommendations = {
    feliz: [
      { title: "Happy", name: "Mitski", from: "/music/puberty_2/01.mp3" },
      { title: "My Body's Made of Crushed Little Stars", name: "Mitski", from: "/music/puberty_2/07.mp3" },
      { title: "Isle Into Thyself", name: "Miracle Musical", from: "/music/hawaii/02.mp3" },
    ],
    triste: [
      { title: "I Bet on Losing Dogs", name: "Mitski", from: "/music/puberty_2/06.mp3" },
      { title: "A Burning Hill", name: "Mitski", from: "/music/puberty_2/10.mp3" },
      { title: "Murders", name: "Miracle Musical", from: "/music/hawaii/05.mp3" },
    ],
    energico: [
      { title: "Slvtcrvsher", name: "Sewerslvt", from: "/music/ss/09.mp3" },
      { title: "The Mind Electric", name: "Miracle Musical", from: "/music/hawaii/07.mp3" },
      { title: "Your Best American Girl", name: "Mitski", from: "/music/puberty_2/05.mp3" },
    ],
    relajado: [
      { title: "Stranded Lullaby", name: "Miracle Musical", from: "/music/hawaii/10.mp3" },
      { title: "Dream Sweet In Sea Major", name: "Miracle Musical", from: "/music/hawaii/11.mp3" },
      { title: "Once More to See You", name: "Mitski", from: "/music/puberty_2/03.mp3" },
    ],
    melancolico: [
      { title: "I Break My Heart & Yours", name: "Sewerslvt", from: "/music/ss/02.mp3" },
      { title: "With You Forever", name: "Sewerslvt", from: "/music/ss/14.mp3" },
      { title: "Crack Baby", name: "Mitski", from: "/music/puberty_2/11.mp3" },
    ]
  };

  const [currentSong, setCurrentSong] = useState(null);
  
  const handleMoodSelect = (mood) => {
    setSelectedMood(mood);
    if (moodRecommendations[mood]) {
      onSelectSongs(moodRecommendations[mood]);
      setCurrentSong(moodRecommendations[mood][0]); // selecciona la primera canción
    }
  };
  

  return (
    <div className="mood-recommender">
      <h2>¿Cómo te sientes hoy?</h2>
      <div className="mood-buttons">
        <button 
          className={`mood-btn ${selectedMood === 'feliz' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('feliz')}
        >
          😊 Feliz
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'triste' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('triste')}
        >
          😢 Triste
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'energico' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('energico')}
        >
          ⚡ Enérgico
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'relajado' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('relajado')}
        >
          😌 Relajado
        </button>
        <button 
          className={`mood-btn ${selectedMood === 'melancolico' ? 'active' : ''}`} 
          onClick={() => handleMoodSelect('melancolico')}
        >
          🌧️ Melancólico
        </button>
      </div>

      {currentSong && (
  <div className="audio-player">
    <h4>Reproduciendo: {currentSong.title} - {currentSong.name}</h4>
  </div>
)}
      
      {selectedMood && (
        <div className="recommendations">
          <h3>Recomendaciones para tu estado de ánimo:</h3>
          <ul>
            {moodRecommendations[selectedMood].map((song, index) => (
              <li key={index}>
                {song.title} - {song.name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default MoodRecommender;