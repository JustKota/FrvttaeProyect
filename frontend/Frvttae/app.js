const songTitle = document.querySelector('.frvttae-reproductor h1');
const songArtist = document.querySelector('.frvttae-reproductor p');
const progress = document.getElementById('progress');
const song = document.getElementById('song');

const playpause = document.querySelector('.play-pause');
const backControl = document.querySelector('.back');
const nextControl = document.querySelector('.next');
const controlicon = document.getElementById('controlicon'); // o querySelector('.controlicon')

const shuffleicon = document.getElementById('shuffleicon');
const repeaticon = document.getElementById('repeaticon');

const playlistContainer = document.getElementById('playlist-container');


const songs = [];
let actualsong = 0;
let shuffle = false;
let modorepetir = false;

// Supón que cada botón de álbum tiene un data-album="relax", etc.
document.querySelectorAll('.album-card').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.preventDefault(); // ¡Evita que cambie de página de inmediato!
        const albumId = btn.getAttribute('data-album');
        localStorage.setItem('albumToPlay', albumId);
        window.location.href = btn.getAttribute('href'); // redirige manualmente
    });
});



document.getElementById('bg-input').addEventListener('change', function(e){
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.body.style.backgroundImage = `url(${e.target.result})`;
        };
        reader.readAsDataURL(file);
    }
});


document.getElementById('music-input').addEventListener('change', function(e){
    const files =Array.from(e.target.files);

    files.forEach((file) => {
        const url =URL.createObjectURL(file);
        const arcname = file.name.replace(/\.[^/.]+$/, "");

        songs.push({
            title: arcname,
            name: 'Local Frvttae',
            from: url
        });
    });

    actualizarPlaylist();
    if (songs.length === files.length){
        updatesonginfo();
    }
});

function actualizarPlaylist() {
    playlistContainer.innerHTML = ''; 
    songs.forEach((song, index) => {
        const li = document.createElement('li');
        li.textContent = `${song.title} - ${song.name}`;

        li.addEventListener('click', () => {
            actualsong = index;
            updatesonginfo();
            playsong();
        });

        if(index === actualsong) {
            li.classList.add('active'); // Añadir clase 'active' al elemento de la lista actual
        };

        playlistContainer.appendChild(li);
    });
}


const albums = {

    personal: [],


    hawaii: [
        { title: "Introduction to the Snow", name: "Miracle Musical", from: "music/hawaii/01.mp3" },
        { title: "Isle Into Thyself", name: "Miracle Musical", from: "music/hawaii/02.mp3" },
        { title: "Black Rainbows", name: "Miracle Musical", from: "music/hawaii/03.mp3" },
        { title: "White Ball", name: "Miracle Musical", from: "music/hawaii/04.mp3" },
        { title: "Murders", name: "Miracle Musical", from: "music/hawaii/05.mp3" },
        { title: "宇宙ステーションのレベル7", name: "Miracle Musical", from: "music/hawaii/06.mp3" },
        { title: "The Mind Electric", name: "Miracle Musical", from: "music/hawaii/07.mp3" },
        { title: "Labyrinth", name: "Miracle Musical", from: "music/hawaii/08.mp3" },
        { title: "Time Machine", name: "Miracle Musical", from: "music/hawaii/09.mp3" },
        { title: "Stranded Lullaby", name: "Miracle Musical", from: "music/hawaii/10.mp3" },
        { title: "Dream Sweet In Sea Major", name: "Miracle Musical", from: "music/hawaii/11.mp3" },
        { title: "Variations on a Cloud", name: "Miracle Musical", from: "music/hawaii/12.mp3" },
    ],

    skitzofrenia: [
        { title: "My Fvcked Up Head", name: "Sewerslvt", from: "music/ss/01.mp3" },
        { title: "I Break My Heart & Yours", name: "Sewerslvt", from: "music/ss/02.mp3" },
        { title: "Looming.Sorrow.Descent", name: "Sewerslvt", from: "music/ss/03.mp3" },
        { title: "I Bleed", name: "Sewerslvt", from: "music/ss/04.mp3" },
        { title: "Restlessness", name: "Sewerslvt", from: "music/ss/05.mp3" },
        { title: "Existing Everywhere", name: "Sewerslvt", from: "music/ss/06.mp3" },
        { title: "Car Accident", name: "Sewerslvt", from: "music/ss/07.mp3" },
        { title: "Purple Hearts In Her Eyes", name: "Sewerslvt", from: "music/ss/08.mp3" },
        { title: "Slvtcrvsher", name: "Sewerslvt", from: "music/ss/09.mp3" },
        { title: "Ecocide Suite", name: "Sewerslvt", from: "music/ss/10.mp3" },
        { title: "Antidepressant", name: "Sewerslvt", from: "music/ss/11.mp3" },
        { title: "Never Existed", name: "Sewerslvt", from: "music/ss/12.mp3" },
        { title: "Blooming Iridescent Flower", name: "Sewerslvt", from: "music/ss/13.mp3" },
        { title: "With You Forever", name: "Sewerslvt", from: "music/ss/14.mp3" },
    ],

    puberty_2: [
        { title: "Happy", name: "Mitski", from: "music/puberty_2/01.mp3" },
        { title: "Dan the Dancer", name: "Mitski", from: "music/puberty_2/02.mp3" },
        { title: "Once More to See You", name: "Mitski", from: "music/puberty_2/03.mp3" },
        { title: "Fireworks", name: "Mitski", from: "music/puberty_2/04.mp3" },
        { title: "Your Best American Girl", name: "Mitski", from: "music/puberty_2/05.mp3" },
        { title: "I Bet on Losing Dogs", name: "Mitski", from: "music/puberty_2/06.mp3" },
        { title: "My Body's Made of Crushed Little Stars", name: "Mitski", from: "music/puberty_2/07.mp3" },
        { title: "Thursday Girl", name: "Mitski", from: "music/puberty_2/08.mp3" },
        { title: "A Loving Feeling", name: "Mitski", from: "music/puberty_2/09.mp3" },
        { title: "A Burning Hill", name: "Mitski", from: "music/puberty_2/10.mp3" },
        { title: "Crack Baby", name: "Mitski", from: "music/puberty_2/11.mp3" }
    ],

    chromakopia: [
        { title: "St.Chroma", name: "Tyler The Creator", from: "music/chromakopia/01.mp3" },
        { title: "Rah Tah Tah", name: "Tyler The Creator", from: "music/chromakopia/02.mp3" },
        { title: "NOID", name: "Tyler The Creator", from: "music/chromakopia/03.mp3" },
        { title: "Darling, I", name: "Tyler The Creator", from: "music/chromakopia/04.mp3" },
        { title: "Hey Jane", name: "Tyler The Creator", from: "music/chromakopia/05.mp3" },
        { title: "I Killed You", name: "Tyler The Creator", from: "music/chromakopia/06.mp3" },
        { title: "Judge Judy", name: "Tyler The Creator", from: "music/chromakopia/07.mp3" },
        { title: "Sticky", name: "Tyler The Creator", from: "music/chromakopia/08.mp3" },
        { title: "Take Your Mask Off", name: "Tyler The Creator", from: "music/chromakopia/09.mp3" },
        { title: "Tomorrow", name: "Tyler The Creator", from: "music/chromakopia/10.mp3" },
        { title: "Thought I Was Dead", name: "Tyler The Creator", from: "music/chromakopia/11.mp3" },
        { title: "Like Him", name: "Tyler The Creator", from: "music/chromakopia/12.mp3" },
        { title: "Balloon", name: "Tyler The Creator", from: "music/chromakopia/13.mp3" },
        { title: "I Hope You Find Your Way Home", name: "Tyler The Creator", from: "music/chromakopia/14.mp3" },
    ],

    


};


const albumId = localStorage.getItem('albumToPlay');
if (albumId && albums[albumId]) {
    songs.push(...albums[albumId]);
    updatesonginfo();
}


function updatesonginfo() {
    if (!songs.length) return;

    songTitle.textContent = songs[actualsong].title;
    songArtist.textContent = songs[actualsong].artist;
    song.src = songs[actualsong].from;
    song.loop = modorepetir;
    actualizarPlaylist();
}


playpause.addEventListener('click', handlePlayPause);

function handlePlayPause() {
    if (song.paused) {
        playsong();
    } else {
        pausesong();
    }
}

function playsong() {
    song.play();
    controlicon.classList.add('bi', 'bi-pause');
    controlicon.classList.remove('bi-play');
}

function pausesong() {
    song.pause();
    controlicon.classList.remove('bi-pause');
    controlicon.classList.add('bi', 'bi-play');
}

song.addEventListener('loadedmetadata', function() {
    progress.max = song.duration;
});

song.addEventListener('timeupdate', function() {
    if (!song.paused) {
        progress.value = song.currentTime;
    }
});

song.addEventListener('ended', function() {

    if (modorepetir) {
        song.currentTime = 0;
        song.play();
        return;
    }

    if (shuffle) {
        actualsong = obtainshufflesong();
    } else {
        actualsong = (actualsong + 1) % songs.length;
    }
    updatesonginfo();
    playsong();
});

function obtainshufflesong() {
    let newindex;
    do {
        newindex = Math.floor(Math.random() * songs.length);
    } while (newindex === actualsong && songs.length > 1);
    return newindex;
}

progress.addEventListener('input', function() {
    song.currentTime = progress.value;
});

progress.addEventListener('change', function() {
    playsong();
});

nextControl.addEventListener('click', function() {

    if(modorepetir) {
        song.currentTime = 0;
        song.play();
        return;
    } 

    if(shuffle){
        actualsong = obtainshufflesong();
    }else {
        actualsong = (actualsong + 1) % songs.length;
    }
    updatesonginfo();
    playsong();
});

backControl.addEventListener('click', function() {

    if(modorepetir) {
        song.currentTime = 0;
        song.play();
        return;
    } 

    if(shuffle){
        actualsong = obtainshufflesong();
    }else {
        actualsong = (actualsong - 1) % songs.length;
    }
    updatesonginfo();
    playsong();
});

shuffleicon.addEventListener('click', function() {
    shuffle = !shuffle;
    shuffleicon.classList.toggle('active', shuffle);

    if (shuffle) {
        modorepetir = false;
        repeaticon.classList.remove('active');
        song.loop = false;
    }
});



repeaticon.addEventListener('click', function() {
    modorepetir = !modorepetir;
    repeaticon.classList.toggle('active', modorepetir);
    song.loop = modorepetir;

    if (modorepetir) {
        shuffle = false;
        shuffleicon.classList.remove('active');
    }
});




updatesonginfo();
