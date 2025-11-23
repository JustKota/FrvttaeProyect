import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './styles.css';
import MoodRecommender from './components/MoodRecommender';
import Albums from './components/Albums';
import { saveAudio, getAudio } from './services/audioStore';

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
  const [filterMood, setFilterMood] = useState(null);

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

  // Cargar canciones guardadas y álbum desde almacenamiento persistente (deduplicado)
  useEffect(() => {
    const init = async () => {
      const initial = [];

      // 1) Album seleccionado via navegación o almacenado
      let selectedAlbum = null;
      if (location.state && location.state.selectedAlbum && albums[location.state.selectedAlbum]) {
        selectedAlbum = location.state.selectedAlbum;
        localStorage.setItem('albumToPlay', selectedAlbum);
      } else {
        const albumId = localStorage.getItem('albumToPlay');
        if (albumId && albums[albumId]) {
          selectedAlbum = albumId;
        }
      }
      if (selectedAlbum) {
        // Añadir canciones del álbum evitando duplicados por "from"
        const albumSongs = albums[selectedAlbum];
        const seenFrom = new Set();
        for (const s of albumSongs) {
          if (!seenFrom.has(s.from)) {
            seenFrom.add(s.from);
            initial.push({ ...s });
          }
        }
      }

      // 2) Restaurar canciones locales desde IndexedDB usando metadatos
      const savedMetaRaw = localStorage.getItem('userSongsMeta');
      if (savedMetaRaw) {
        try {
          const metas = JSON.parse(savedMetaRaw);
          const seenIds = new Set();
          for (const meta of metas) {
            if (!meta?.id || seenIds.has(meta.id)) continue;
            seenIds.add(meta.id);
            try {
              const blob = await getAudio(meta.id);
              if (!blob) continue;
              const url = URL.createObjectURL(blob);
              // Re-analizar para recuperar métricas y mejorar clasificación dinámica
              let analysis = null;
              try {
                analysis = await analyzeSongMood(blob);
              } catch {}
              initial.push({
                title: meta.title,
                name: 'Local Frvttae',
                from: url,
                mood: (analysis && analysis.mood) || meta.mood || 'relajado',
                type: meta.type || blob.type,
                id: meta.id,
                _analysis: analysis || undefined
              });
            } catch (err) {
              console.warn('No se pudo restaurar audio', meta.id, err);
            }
          }
        } catch (error) {
          console.error('Error al cargar metadatos guardados:', error);
        }
      }

      // 3) Establecer canciones con recategorización dinámica
      const categorized = recategorizeSongsDynamically(initial);
      setSongs(categorized);
    };
    init();
  }, [location.state]);

  // Guardar metadatos de canciones del usuario en localStorage (no blobs) con deduplicación
  useEffect(() => {
    const userSongs = songs.filter(song => song.name === 'Local Frvttae');
    if (userSongs.length > 0) {
      const metasMap = new Map();
      for (const s of userSongs) {
        if (!s.id) continue;
        if (!metasMap.has(s.id)) {
          metasMap.set(s.id, { id: s.id, title: s.title, mood: s.mood, type: s.type });
        }
      }
      const metas = Array.from(metasMap.values());
      try {
        localStorage.setItem('userSongsMeta', JSON.stringify(metas));
      } catch (err) {
        console.error('No se pudieron guardar metadatos en localStorage:', err);
      }
    }
  }, [songs]);

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

  // Analizador de estado de ánimo mejorado usando Web Audio API
  async function analyzeSongMood(file) {
      try {
          const arrayBuffer = await file.arrayBuffer();
          const audioContext = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(1, 44100 * 30, 44100);
          const audioData = await audioContext.decodeAudioData(arrayBuffer);
          const channelData = audioData.getChannelData(0);
          
          // Analizar solo los primeros 30 segundos para mejor rendimiento
          const sampleLength = Math.min(channelData.length, 44100 * 30);
          const samples = channelData.slice(0, sampleLength);
  
          // 1. Calcular RMS (energía promedio)
          let sumSquares = 0;
          for (let i = 0; i < samples.length; i++) {
              sumSquares += samples[i] * samples[i];
          }
          const rms = Math.sqrt(sumSquares / samples.length);
  
          // 2. Calcular Zero-Crossing Rate (ZCR) - indica rugosidad/percusión
          let zeroCrossings = 0;
          for (let i = 1; i < samples.length; i++) {
              if ((samples[i - 1] >= 0 && samples[i] < 0) || (samples[i - 1] < 0 && samples[i] >= 0)) {
                  zeroCrossings++;
              }
          }
          const zcr = zeroCrossings / samples.length;
  
          // 3. Calcular varianza de la energía (dinámicas)
          const windowSize = 4410; // 0.1 segundos
          const energyWindows = [];
          for (let i = 0; i < samples.length - windowSize; i += windowSize) {
              let windowEnergy = 0;
              for (let j = i; j < i + windowSize; j++) {
                  windowEnergy += samples[j] * samples[j];
              }
              energyWindows.push(Math.sqrt(windowEnergy / windowSize));
          }
          
          const meanEnergy = energyWindows.reduce((a, b) => a + b, 0) / energyWindows.length;
          const energyVariance = energyWindows.reduce((sum, energy) => sum + Math.pow(energy - meanEnergy, 2), 0) / energyWindows.length;

          // 3b. Estimar BPM mediante autocorrelación del envolvente de energía
          const windowRate = 44100 / windowSize; // ~10 Hz (ventanas por segundo)
          const minLag = 3;   // ~200 BPM
          const maxLag = 20;  // ~60 BPM
          let bestLag = 0;
          let bestCorr = -Infinity;
          for (let lag = minLag; lag <= maxLag; lag++) {
              let sum = 0;
              for (let i = 0; i < energyWindows.length - lag; i++) {
                  sum += energyWindows[i] * energyWindows[i + lag];
              }
              if (sum > bestCorr) {
                  bestCorr = sum;
                  bestLag = lag;
              }
          }
          const bpm = bestLag > 0 ? Math.round((60 * windowRate) / bestLag) : 0;

          // 3c. Tasa de onsets (incrementos de energía)
          const energyStd = Math.sqrt(energyVariance);
          const onsetThreshold = Math.max(0.01, 0.5 * energyStd);
          let onsets = 0;
          for (let i = 1; i < energyWindows.length; i++) {
              if (energyWindows[i] - energyWindows[i - 1] > onsetThreshold) {
                  onsets++;
              }
          }
          const durationSec = energyWindows.length / windowRate;
          const onsetPerSec = durationSec > 0 ? onsets / durationSec : 0;

          // 3d. Ratio de silencio
          const silenceThreshold = Math.max(0.005, meanEnergy * 0.5);
          const silentWindows = energyWindows.filter(e => e < silenceThreshold).length;
          const silenceRatio = energyWindows.length > 0 ? silentWindows / energyWindows.length : 0;
  
          // 4. Análisis de frecuencias (aproximado usando autocorrelación)
          let lowFreqEnergy = 0;
          let midFreqEnergy = 0;
          let highFreqEnergy = 0;
          
          const segmentSize = Math.floor(samples.length / 3);
          for (let i = 0; i < segmentSize; i++) {
              lowFreqEnergy += Math.abs(samples[i]);
          }
          for (let i = segmentSize; i < segmentSize * 2; i++) {
              midFreqEnergy += Math.abs(samples[i]);
          }
          for (let i = segmentSize * 2; i < samples.length; i++) {
              highFreqEnergy += Math.abs(samples[i]);
          }
          
          lowFreqEnergy /= segmentSize;
          midFreqEnergy /= segmentSize;
          highFreqEnergy /= segmentSize;
  
          // 5. Clasificación mejorada con múltiples características
          let mood = 'relajado';

          // Energético: BPM alto, muchos onsets, alta energía y ZCR
          if (bpm >= 120 && onsetPerSec > 1.0 && rms > 0.045 && zcr > 0.035) {
              mood = 'energico';
          }
          // Feliz: BPM medio-alto, frecuencias medias dominantes, varianza moderada
          else if (bpm >= 95 && bpm <= 140 && midFreqEnergy > lowFreqEnergy && energyVariance > 0.0005 && zcr >= 0.02 && zcr <= 0.05) {
              mood = 'feliz';
          }
          // Triste: BPM bajo, baja energía, graves dominantes, pocos onsets y ZCR bajo
          else if (bpm < 85 && rms < 0.04 && lowFreqEnergy > midFreqEnergy && onsetPerSec < 0.5 && zcr < 0.03) {
              mood = 'triste';
          }
          // Melancólico: BPM muy bajo, energía y varianza muy bajas, mucho silencio
          else if (bpm < 70 && rms < 0.03 && energyVariance < 0.0006 && silenceRatio > 0.15) {
              mood = 'melancolico';
          }
          // Relajado: BPM medio, energía moderada, varianza baja, frecuencias equilibradas
          else if (bpm >= 70 && bpm <= 110 && rms >= 0.025 && rms <= 0.05 && energyVariance < 0.0009) {
              mood = 'relajado';
          }
          // Si no encaja en ninguna categoría específica, usar energía como criterio principal
          else if (rms > 0.06) {
              mood = 'energico';
          } else if (rms < 0.02) {
              mood = 'melancolico';
          }
  
          console.log(`Análisis de "${file.name}": BPM=${bpm}, Onsets/s=${onsetPerSec.toFixed(2)}, Silencio=${(silenceRatio*100).toFixed(1)}%, RMS=${rms.toFixed(4)}, ZCR=${zcr.toFixed(6)}, Varianza=${energyVariance.toFixed(6)}, Mood=${mood}`);
          
          return { 
              mood, 
              rms, 
              zcr, 
              energyVariance,
              bpm,
              onsetPerSec,
              silenceRatio,
              lowFreqEnergy,
              midFreqEnergy,
              highFreqEnergy
          };
      } catch (e) {
          console.error('Error analizando canción:', e);
          return { mood: 'relajado', rms: 0, zcr: 0 };
      }
  }

  // --- Umbrales dinámicos y recategorización por percentiles (para reducir sesgo) ---
  const computePercentiles = (arr) => {
    if (!arr || arr.length === 0) return { p20: 0, p40: 0, p60: 0, p80: 0 };
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p) => Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * sorted.length)));
    return {
      p20: sorted[idx(20)],
      p40: sorted[idx(40)],
      p60: sorted[idx(60)],
      p80: sorted[idx(80)],
    };
  };

  const recategorizeSongsDynamically = (allSongs) => {
    const userSongs = allSongs.filter(s => s.name === 'Local Frvttae' && s._analysis);
    if (userSongs.length === 0) return allSongs;

    const metrics = {
      bpm: userSongs.map(s => s._analysis.bpm || 0),
      onsets: userSongs.map(s => s._analysis.onsetPerSec || 0),
      rms: userSongs.map(s => s._analysis.rms || 0),
      zcr: userSongs.map(s => s._analysis.zcr || 0),
      variance: userSongs.map(s => s._analysis.energyVariance || 0),
      silence: userSongs.map(s => s._analysis.silenceRatio || 0),
      low: userSongs.map(s => s._analysis.lowFreqEnergy || 0),
      mid: userSongs.map(s => s._analysis.midFreqEnergy || 0),
      high: userSongs.map(s => s._analysis.highFreqEnergy || 0),
    };

    const P = {
      bpm: computePercentiles(metrics.bpm),
      onsets: computePercentiles(metrics.onsets),
      rms: computePercentiles(metrics.rms),
      zcr: computePercentiles(metrics.zcr),
      variance: computePercentiles(metrics.variance),
      silence: computePercentiles(metrics.silence),
      low: computePercentiles(metrics.low),
      mid: computePercentiles(metrics.mid),
      high: computePercentiles(metrics.high),
    };

    const classify = (a) => {
      const bpm = a.bpm || 0;
      const onsets = a.onsetPerSec || 0;
      const rms = a.rms || 0;
      const zcr = a.zcr || 0;
      const variance = a.energyVariance || 0;
      const silence = a.silenceRatio || 0;
      const low = a.lowFreqEnergy || 0;
      const mid = a.midFreqEnergy || 0;
      const high = a.highFreqEnergy || 0;

      if (bpm >= P.bpm.p80 && onsets >= P.onsets.p80 && rms >= P.rms.p80 && zcr >= P.zcr.p60) return 'energico';
      if (bpm >= P.bpm.p60 && bpm <= P.bpm.p80 && mid >= P.mid.p60 && variance >= P.variance.p60 && zcr >= P.zcr.p40 && zcr <= P.zcr.p70) return 'feliz';
      if (bpm <= P.bpm.p40 && rms <= P.rms.p40 && low >= P.low.p60 && onsets <= P.onsets.p40 && zcr <= P.zcr.p40) return 'triste';
      if (bpm <= P.bpm.p20 && rms <= P.rms.p20 && silence >= P.silence.p80 && variance <= P.variance.p20 && zcr <= P.zcr.p20) return 'melancolico';
      if (bpm >= P.bpm.p40 && bpm <= P.bpm.p60 && rms >= P.rms.p40 && rms <= P.rms.p60 && variance <= P.variance.p40) return 'relajado';
      if (bpm >= P.bpm.p70 || rms >= P.rms.p70) return 'energico';
      if (bpm <= P.bpm.p30 || rms <= P.rms.p30) return silence >= P.silence.p60 ? 'melancolico' : 'triste';
      return mid >= low ? 'feliz' : 'relajado';
    };

    return allSongs.map(s => {
      if (s.name === 'Local Frvttae' && s._analysis) {
        const newMood = classify(s._analysis);
        return { ...s, mood: newMood };
      }
      return s;
    });
  };

  const handleMusicUpload = async (e) => {
      const files = Array.from(e.target.files);
      const analyzedSongsPromises = files.map(async (file) => {
          // Guardar blob en IndexedDB y usar ObjectURL para reproducción
          const arcName = file.name.replace(/\.[^/.]+$/, "");
          const analysis = await analyzeSongMood(file);
          const id = `${Date.now()}_${arcName}_${Math.random().toString(36).slice(2,8)}`;
          try {
            await saveAudio(id, file);
          } catch (err) {
            console.error('Error guardando audio en IndexedDB:', err);
          }
          const url = URL.createObjectURL(file);
          return {
              title: arcName,
              name: 'Local Frvttae',
              from: url,
              type: file.type,
              id,
              mood: analysis.mood,
              _analysis: analysis
          };
      });

      const analyzedSongs = await Promise.all(analyzedSongsPromises);
      const merged = [...songs, ...analyzedSongs];
      const categorizedUpload = recategorizeSongsDynamically(merged);
      setSongs(categorizedUpload);
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
    // Activar filtro en playlist por emoción seleccionada
    const mood = (recommendedSongs && recommendedSongs[0] && (recommendedSongs[0].mood || '').toLowerCase()) || null;
    setFilterMood(mood);
    setIsPlaying(true);
    setShowMoodRecommender(false);

    // Posicionar el reproductor en la primera recomendada dentro de la lista global
    const firstRecommendedIndex = songs.findIndex(song => 
      recommendedSongs.some(rec => 
        (rec.id && song.id === rec.id) ||
        (rec.title === song.title && rec.name === song.name && rec.from === song.from)
      )
    );
    if (firstRecommendedIndex !== -1) {
      setActualSong(firstRecommendedIndex);
    }
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
          <MoodRecommender sourceSongs={songs} onSelectSongs={handleMoodSongSelect} />
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
        <h2>Playlist {filterMood ? `(filtrado: ${filterMood})` : ''}</h2>
        {filterMood && (
          <button className="clear-filter" onClick={() => setFilterMood(null)}>Mostrar todo</button>
        )}
        <ul id="playlist-container">
          {(filterMood ? songs.filter(s => (s.mood || '').toLowerCase() === filterMood) : songs).map((song, idx) => {
            const globalIndex = songs.findIndex(s => 
              (song.id && s.id === song.id) || 
              (s.title === song.title && s.name === song.name && s.from === song.from)
            );
            return (
              <li 
                key={globalIndex !== -1 ? globalIndex : idx} 
                className={globalIndex === actualSong ? 'active' : ''}
                onClick={() => handleSongSelect(globalIndex !== -1 ? globalIndex : idx)}
              >
                {song.title} - {song.name}
              </li>
            );
          })}
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