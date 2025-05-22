import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './styles.css';
import MoodRecommender from './components/MoodRecommender';
import Albums from './components/Albums';

function App() {
  const location = useLocation();
  const [songs, setSongs] = useState([]);
  const [actualSong, setActualSong] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [modoRepetir, setModoRepetir] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showMoodRecommender, setShowMoodRecommender] = useState(false);
  const [showAlbums, setShowAlbums] = useState(false);

  const audioRef = useRef(null);
  const progressRef = useRef(null);

  const albums = {
    personal: [],
    hawaii: [
      { title: "Introduction to the Snow", name: "Miracle Musical", from: "/music/hawaii/01.mp3" },
      { title: "Isle Into Thyself", name: "Miracle Musical", from: "/music/hawaii/02.mp3" },
      { title: "Black Rainbows", name: "Miracle Musical", from: "/music/hawaii/03.mp3" },
      { title: "White Ball", name: "Miracle Musical", from: "/music/hawaii/04.mp3" },
      { title: "Murders", name: "Miracle Musical", from: "/music/hawaii/05.mp3" },
      { title: "宇宙ステーションのレベル7", name: "Miracle Musical", from: "/music/hawaii/06.mp3" },
      { title: "The Mind Electric", name: "Miracle Musical", from: "/music/hawaii/07.mp3" },
      { title: "Labyrinth", name: "Miracle Musical", from: "/music/hawaii/08.mp3" },
      { title: "Time Machine", name: "Miracle Musical", from: "/music/hawaii/09.mp3" },
      { title: "Stranded Lullaby", name: "Miracle Musical", from: "/music/hawaii/10.mp3" },
      { title: "Dream Sweet In Sea Major", name: "Miracle Musical", from: "/music/hawaii/11.mp3" },
      { title: "Variations on a Cloud", name: "Miracle Musical", from: "/music/hawaii/12.mp3" },
    ],
    skitzofrenia: [
      { title: "My Fvcked Up Head", name: "Sewerslvt", from: "/music/ss/01.mp3" },
      { title: "I Break My Heart & Yours", name: "Sewerslvt", from: "/music/ss/02.mp3" },
      { title: "Looming.Sorrow.Descent", name: "Sewerslvt", from: "/music/ss/03.mp3" },
      { title: "I Bleed", name: "Sewerslvt", from: "/music/ss/04.mp3" },
      { title: "Restlessness", name: "Sewerslvt", from: "/music/ss/05.mp3" },
      { title: "Existing Everywhere", name: "Sewerslvt", from: "/music/ss/06.mp3" },
      { title: "Car Accident", name: "Sewerslvt", from: "/music/ss/07.mp3" },
      { title: "Purple Hearts In Her Eyes", name: "Sewerslvt", from: "/music/ss/08.mp3" },
      { title: "Slvtcrvsher", name: "Sewerslvt", from: "/music/ss/09.mp3" },
      { title: "Ecocide Suite", name: "Sewerslvt", from: "/music/ss/10.mp3" },
      { title: "Antidepressant", name: "Sewerslvt", from: "/music/ss/11.mp3" },
      { title: "Never Existed", name: "Sewerslvt", from: "/music/ss/12.mp3" },
      { title: "Blooming Iridescent Flower", name: "Sewerslvt", from: "/music/ss/13.mp3" },
      { title: "With You Forever", name: "Sewerslvt", from: "/music/ss/14.mp3" },
    ],
    puberty_2: [
      { title: "Happy", name: "Mitski", from: "/music/puberty_2/01.mp3" },
      { title: "Dan the Dancer", name: "Mitski", from: "/music/puberty_2/02.mp3" },
      { title: "Once More to See You", name: "Mitski", from: "/music/puberty_2/03.mp3" },
      { title: "Fireworks", name: "Mitski", from: "/music/puberty_2/04.mp3" },
      { title: "Your Best American Girl", name: "Mitski", from: "/music/puberty_2/05.mp3" },
      { title: "I Bet on Losing Dogs", name: "Mitski", from: "/music/puberty_2/06.mp3" },
      { title: "My Body's Made of Crushed Little Stars", name: "Mitski", from: "/music/puberty_2/07.mp3" },
      { title: "Thursday Girl", name: "Mitski", from: "/music/puberty_2/08.mp3" },
      { title: "A Loving Feeling", name: "Mitski", from: "/music/puberty_2/09.mp3" },
      { title: "A Burning Hill", name: "Mitski", from: "/music/puberty_2/10.mp3" },
      { title: "Crack Baby", name: "Mitski", from: "/music/puberty_2/11.mp3" }
    ],
  };

  // Cargar álbum desde localStorage o desde el estado de navegación
  useEffect(() => {
    // Verificar si hay un álbum seleccionado en el estado de navegación
    if (location.state && location.state.selectedAlbum && albums[location.state.selectedAlbum]) {
      setSongs([...albums[location.state.selectedAlbum]]);
      localStorage.setItem('albumToPlay', location.state.selectedAlbum);
      return;
    }
    
    // Si no hay estado de navegación, intentar cargar desde localStorage
    const albumId = localStorage.getItem('albumToPlay');
    if (albumId && albums[albumId]) {
      setSongs([...albums[albumId]]);
    }
  }, [location.state]);

  // Actualizar información de la canción cuando cambia
  useEffect(() => {
    if (songs.length > 0) {
      if (audioRef.current) {
        audioRef.current.src = songs[actualSong].from;
        audioRef.current.loop = modoRepetir;
        if (isPlaying) {
          audioRef.current.play();
        }
      }
    }
  }, [actualSong, songs, modoRepetir]);

  // Manejar eventos del audio
  useEffect(() => {
    const audio = audioRef.current;
    
    if (!audio) return;

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleEnded = () => {
      if (modoRepetir) {
        audio.currentTime = 0;
        audio.play();
        return;
      }

      if (shuffle) {
        setActualSong(obtainShuffleSong());
      } else {
        setActualSong((actualSong + 1) % songs.length);
      }
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [actualSong, modoRepetir, shuffle, songs.length]);

  // Controlar reproducción
  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play();
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleNext = () => {
    if (modoRepetir) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (shuffle) {
      setActualSong(obtainShuffleSong());
    } else {
      setActualSong((actualSong + 1) % songs.length);
    }
  };

  const handleBack = () => {
    if (modoRepetir) {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
      return;
    }

    if (shuffle) {
      setActualSong(obtainShuffleSong());
    } else {
      setActualSong((actualSong - 1 + songs.length) % songs.length);
    }
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleShuffleToggle = () => {
    setShuffle(!shuffle);
    if (!shuffle) {
      setModoRepetir(false);
      if (audioRef.current) {
        audioRef.current.loop = false;
      }
    }
  };

  const handleRepeatToggle = () => {
    setModoRepetir(!modoRepetir);
    if (audioRef.current) {
      audioRef.current.loop = !modoRepetir;
    }
    if (!modoRepetir) {
      setShuffle(false);
    }
  };

  const obtainShuffleSong = () => {
    let newIndex;
    do {
      newIndex = Math.floor(Math.random() * songs.length);
    } while (newIndex === actualSong && songs.length > 1);
    return newIndex;
  };

  const handleSongSelect = (index) => {
    setActualSong(index);
    setIsPlaying(true);
  };

  const handleMusicUpload = (e) => {
    const files = Array.from(e.target.files);
    const newSongs = files.map(file => {
      const url = URL.createObjectURL(file);
      const arcName = file.name.replace(/\.[^/.]+$/, "");
      return {
        title: arcName,
        name: 'Local Frvttae',
        from: url
      };
    });

    setSongs(prevSongs => [...prevSongs, ...newSongs]);
  };

  const handleBackgroundChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function(e) {
        document.body.style.backgroundImage = `url(${e.target.result})`;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMoodSongSelect = (recommendedSongs) => {
    setSongs(recommendedSongs);
    setActualSong(0);
    setIsPlaying(true);
    setShowMoodRecommender(false);
  };

  return (
    <section className="frvttae-reproductor">
      <div className="selector-arc">
        <div className="selector selector-music">                        
          <label htmlFor="music-input">Agregar</label>
          <input id="music-input" type="file" multiple accept="audio/*" onChange={handleMusicUpload} />
        </div>
        <div className="selector selector-bg">
          <label htmlFor="bg-input">Background</label>
          <input id="bg-input" type="file" accept="image/*" onChange={handleBackgroundChange} />
        </div>
        <div className="selector selector-mood">
          <button onClick={() => setShowMoodRecommender(!showMoodRecommender)}>
            {showMoodRecommender ? 'Ocultar' : 'Recomendador'}
          </button>
        </div>
        <div className="selector selector-albums">
          <button onClick={() => setShowAlbums(!showAlbums)}>
            {showAlbums ? 'Ocultar Álbumes' : 'Ver Álbumes'}
          </button>
        </div>
      </div>

      {showMoodRecommender && (
        <div className="mood-recommender-container">
          <MoodRecommender onSelectSongs={handleMoodSongSelect} />
        </div>
      )}

      {showAlbums && (
        <div className="albums-container-wrapper">
          <Albums onSelectAlbum={(albumId) => {
            if (albums[albumId]) {
              setSongs([...albums[albumId]]);
              setActualSong(0);
              setIsPlaying(true);
              setShowAlbums(false);
            }
          }} />
        </div>
      )}

      <div className="playlist">
        <h2>Playlist</h2>
        <ul id="playlist-container">
          {songs.map((song, index) => (
            <li 
              key={index} 
              className={index === actualSong ? 'active' : ''}
              onClick={() => handleSongSelect(index)}
            >
              {song.title} - {song.name}
            </li>
          ))}
        </ul>
      </div>
      
      <h1>{songs.length > 0 ? songs[actualSong].title : 'Title'}</h1>
      <p>{songs.length > 0 ? songs[actualSong].name : 'Artist'}</p>  
      
      <audio ref={audioRef} id="song"></audio>
      
      <input 
        type="range" 
        value={progress} 
        max={duration || 100}
        id="progress"
        onChange={handleProgressChange}
      />
      
      <div className="controls">
        <button 
          className={`shuffle control ${shuffle ? 'active' : ''}`}
          onClick={handleShuffleToggle}
        >
          <i className="bi bi-shuffle" id="shuffleicon"></i>
        </button>
        
        <button className="back control" onClick={handleBack}>
          <i className="bi bi-rewind"></i>
        </button>
        
        <button className="play-pause controlicon" onClick={handlePlayPause}>
          <i className={`bi ${isPlaying ? 'bi-pause' : 'bi-play'}`} id="controlicon"></i>
        </button>
        
        <button className="next control" onClick={handleNext}>
          <i className="bi bi-fast-forward"></i>
        </button>
        
        <button 
          className={`repeat control ${modoRepetir ? 'active' : ''}`}
          onClick={handleRepeatToggle}
        >
          <i className="bi bi-repeat" id="repeaticon"></i>
        </button>
      </div>
    </section>
  );
}

export default App;