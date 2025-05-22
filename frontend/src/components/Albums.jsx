import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../styles.css';

function Albums({ onSelectAlbum }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedAlbum, setSelectedAlbum] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const albums = {
    hawaii: {
      title: "Hawaii: Part II",
      artist: "Miracle Musical",
      cover: "/covers/hawaiipartii.jpg",
      year: "2012"
    },
    skitzofrenia: {
      title: "Skitzofrenia Simulation",
      artist: "Sewerslvt",
      cover: "/covers/skitz_simu.jpeg",
      year: "2020"
    },
    puberty_2: {
      title: "Puberty 2",
      artist: "Mitski",
      cover: "/covers/puberty_2.jpeg",
      year: "2016"
    },
    personal: {
      title: "Mi Colección",
      artist: "Varios Artistas",
      cover: "/covers/frutteoicon.png",
      year: "2023"
    }
  };

  const handleAlbumSelect = (albumId) => {
    setSelectedAlbum(albumId);
    localStorage.setItem('albumToPlay', albumId);
    
    // Añadir un pequeño retraso para mostrar la selección antes de navegar
    setTimeout(() => {
      if (onSelectAlbum) {
        onSelectAlbum(albumId);
      } else {
        // Si no hay callback, navegar a la página principal con el álbum seleccionado
        navigate('/', { state: { selectedAlbum: albumId } });
      }
    }, 300);
  };

  const handleGoBack = () => {
    navigate('/');
  };

  useEffect(() => {
    // Recuperar el álbum seleccionado del localStorage al cargar
    const savedAlbum = localStorage.getItem('albumToPlay');
    if (savedAlbum && albums[savedAlbum]) {
      setSelectedAlbum(savedAlbum);
    }
    
    // Verificar si hay un álbum seleccionado en el estado de navegación
    if (location.state && location.state.selectedAlbum) {
      setSelectedAlbum(location.state.selectedAlbum);
    }
    
    // Simular carga de imágenes
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [location.state]);

  return (
    <div className="albums-container">
      <div className="albums-header">
        <h2>Mis Álbumes</h2>
      </div>
      
      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Cargando álbumes...</p>
        </div>
      ) : (
      <div className="albums-grid">
        {Object.entries(albums).map(([id, album]) => (
          <div 
            key={id} 
            className={`album-card ${selectedAlbum === id ? 'selected' : ''}`}
            onClick={() => handleAlbumSelect(id)}
          >
            <div className="album-cover">
              <img src={album.cover} alt={album.title} onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/covers/default.jpg';
              }} />
            </div>
            <div className="album-info">
              <h3>{album.title}</h3>
              <p>{album.artist}</p>
              <p className="album-year">{album.year}</p>
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
}

export default Albums;