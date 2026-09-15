
const supabaseClient = window.supabaseClient || window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
let movies=[], series=[], seasons=[], episodes=[], selectedMovie=null, selectedSeries=null, heroIndex=0, heroTimer=null, currentSeasonId=null;
const profiles=['Guest','Cinema Fan','Movie Lover','Series Fan'];
let activeProfile=localStorage.getItem('movieCinamaxProfile')||'Guest';
let watchHistory=[];
try{watchHistory=JSON.parse(localStorage.getItem('movieCinamaxHistory')||'[]')}catch{watchHistory=[]}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove('show'),1800)}
function saveHistory(movie){if(!movie?.title)return;watchHistory=[movie.title,...watchHistory.filter(x=>x!==movie.title)].slice(0,20);localStorage.setItem('movieCinamaxHistory',JSON.stringify(watchHistory));renderContinue();if(typeof displayRecommended==='function')displayRecommended()}
function renderContinue(){const box=document.getElementById('continueMovies'),sec=document.getElementById('continueSection');if(!box)return;const list=watchHistory.map(t=>movies.find(m=>m.title===t)).filter(Boolean);sec.style.display=list.length?'block':'none';box.innerHTML='';list.slice(0,6).forEach(m=>{const c=document.createElement('div');c.className='movie-card continue-card';c.innerHTML=`<div class="poster"><img src="${safeImage(m.poster_url,moviePlaceholder)}" alt="${escapeHTML(m.title||'Movie')}" loading="lazy"><div class="poster-gradient"></div><div class="rating">⭐ ${escapeHTML(m.rating||'N/A')}</div><div class="progress"><i></i></div></div><div class="movie-info"><div class="movie-title">${escapeHTML(m.title||'Movie')}</div><div class="movie-meta">Continue watching</div></div>`;imageFallback(c.querySelector('img'),moviePlaceholder);c.onclick=()=>showMovieDetails(m);box.appendChild(c)})}
function openProfile(){const box=document.getElementById('profileOptions');box.innerHTML='';profiles.forEach(p=>{const b=document.createElement('button');b.className='profile-option'+(p===activeProfile?' active':'');b.textContent=p;b.onclick=()=>{activeProfile=p;localStorage.setItem('movieCinamaxProfile',p);document.getElementById('profileName').textContent=p;document.getElementById('profileModal').classList.remove('active');toast('Profile switched to '+p)};box.appendChild(b)});document.getElementById('profileModal').classList.add('active')}
function initProfile(){document.getElementById('profileName').textContent=activeProfile;document.getElementById('profileButton').onclick=openProfile;document.getElementById('profileClose').onclick=()=>document.getElementById('profileModal').classList.remove('active');document.getElementById('profileModal').onclick=e=>{if(e.target===e.currentTarget)e.currentTarget.classList.remove('active')}}
function initAdvancedFilters(){const cat=document.getElementById('filterCategory'),year=document.getElementById('filterYear');[...new Set(movies.map(m=>m.category).filter(Boolean))].sort().forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;cat.appendChild(o)});[...new Set(movies.map(m=>m.release_year).filter(Boolean))].sort((a,b)=>b-a).forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;year.appendChild(o)});['advancedSearch','filterCategory','filterYear','filterRating','movieSort'].forEach(id=>document.getElementById(id)?.addEventListener('input',applyAdvancedFilters));document.getElementById('clearFilters').onclick=()=>{document.getElementById('advancedSearch').value='';document.getElementById('filterCategory').value='';document.getElementById('filterYear').value='';document.getElementById('filterRating').value='';document.getElementById('movieSort').value='latest';applyAdvancedFilters()}}
function applyAdvancedFilters(){let list=[...movies],q=(document.getElementById('advancedSearch')?.value||'').toLowerCase().trim(),cat=document.getElementById('filterCategory')?.value,year=document.getElementById('filterYear')?.value,min=Number(document.getElementById('filterRating')?.value||0),sort=document.getElementById('movieSort')?.value||'latest';if(q)list=list.filter(m=>`${m.title||''} ${m.category||''} ${m.description||''}`.toLowerCase().includes(q));if(cat)list=list.filter(m=>m.category===cat);if(year)list=list.filter(m=>String(m.release_year)===year);if(min)list=list.filter(m=>Number(m.rating||0)>=min);if(sort==='rating')list.sort((a,b)=>Number(b.rating||0)-Number(a.rating||0));else if(sort==='title')list.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));else list.sort((a,b)=>Number(b.release_year||0)-Number(a.release_year||0));renderMovies('latestMovies',list.slice(0,24))}


const moviePlaceholder='https://via.placeholder.com/400x600?text=Movie';
const seriesPlaceholder='https://via.placeholder.com/400x600?text=Series';

function escapeHTML(v){
  return String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function safeImage(url,fallback){return url||fallback;}
function getVideoUrl(url){
  if(!url)return '';
  const m=url.match(/\/file\/d\/([^/]+)/);
  return m ? 'https://drive.google.com/file/d/'+m[1]+'/preview' : url;
}
function imageFallback(img,fallback){img.onerror=()=>{img.onerror=null;img.src=fallback};}

async function loadMovies(){
  const box=document.getElementById('trendingMovies');
  const {data,error}=await supabaseClient.from('Movies').select('*').eq('published',true).order('release_year',{ascending:false});
  if(error){console.error(error);box.innerHTML='<div class="error-box">Unable to load movies.<br><button class="retry-btn" onclick="loadMovies()">Retry</button></div>';document.getElementById('latestMovies').innerHTML='<div class="empty">Movies are temporarily unavailable.</div>';return;}
  movies=data||[];
  updateQuickStats();
  createHero();createCategories();displayTrending();displayTopRated();displayRecommended();displayLatest();displayMyList();
}

async function loadSeries(){
  const box=document.getElementById('seriesGrid');
  const {data,error}=await supabaseClient.from('Series').select('*').eq('published',true).order('release_year',{ascending:false});
  if(error){console.error(error);box.innerHTML='<div class="error-box">Unable to load series.<br><button class="retry-btn" onclick="loadSeries()">Retry</button></div>';return;}
  series=data||[];updateQuickStats();renderSeries(series);
}

function createHero(){
  const hero=document.getElementById('hero');hero.innerHTML='';
  if(!movies.length){hero.innerHTML='<div class="hero-anime-art"></div><div class="hero-anime-glow"></div><div class="hero-anime-mark">MOVIE CINAMAX // DARK RED</div><div class="hero-content"><div class="hero-label">Welcome</div><h1 class="hero-title">Movie Cinamax</h1><p class="hero-description">Your movie entertainment destination.</p></div>';return;}
  const featured=movies.slice(0,5);
  featured.forEach((movie,index)=>{
    const slide=document.createElement('div');slide.className='hero-slide'+(index===0?' active':'');
    slide.style.backgroundImage=`url("${safeImage(movie.poster_url,'https://via.placeholder.com/1600x900?text=Movie')}")`;
    const animeArt=document.createElement('div');animeArt.className='hero-anime-art';
    const animeGlow=document.createElement('div');animeGlow.className='hero-anime-glow';
    const animeMark=document.createElement('div');animeMark.className='hero-anime-mark';animeMark.textContent='MOVIE CINAMAX // DARK RED';
    slide.append(animeArt,animeGlow,animeMark);
    const content=document.createElement('div');content.className='hero-content';
    content.innerHTML=`<div class="hero-label">Featured Movie</div><h1 class="hero-title">${escapeHTML(movie.title||'Movie')}</h1><div class="hero-info">⭐ ${escapeHTML(movie.rating||'N/A')} <span>•</span> ${escapeHTML(movie.release_year||'N/A')} <span>•</span> ${escapeHTML(movie.category||'Movie')}</div><p class="hero-description">${escapeHTML(movie.description||'')}</p><div class="hero-buttons"><button class="hero-btn hero-watch">▶ Watch Now</button><button class="hero-btn hero-list">＋ My List</button></div>`;
    content.querySelector('.hero-watch').onclick=()=>showMovieDetails(movie);
    content.querySelector('.hero-list').onclick=()=>addToList(movie.title);
    slide.appendChild(document.createElement('div'));slide.firstChild.className='hero-overlay';slide.appendChild(content);hero.appendChild(slide);
  });
  const dots=document.createElement('div');dots.className='hero-dots';
  featured.forEach((_,i)=>{const d=document.createElement('button');d.className='hero-dot'+(i===0?' active':'');d.setAttribute('aria-label','Show featured movie '+(i+1));d.onclick=()=>showHero(i);dots.appendChild(d)});
  hero.appendChild(dots);clearInterval(heroTimer);heroTimer=setInterval(nextHero,5000);
}
function showHero(i){const s=document.querySelectorAll('.hero-slide'),d=document.querySelectorAll('.hero-dot');if(!s.length)return;s.forEach(x=>x.classList.remove('active'));d.forEach(x=>x.classList.remove('active'));heroIndex=i;s[i]?.classList.add('active');d[i]?.classList.add('active')}
function nextHero(){const c=document.querySelectorAll('.hero-slide').length;if(c){heroIndex=(heroIndex+1)%c;showHero(heroIndex)}}

function createCategories(){
  const box=document.getElementById('categories');const cats=['All',...new Set(movies.map(x=>x.category).filter(Boolean))];box.innerHTML='';
  cats.forEach((cat,i)=>{const b=document.createElement('button');b.className='category-btn'+(i===0?' active':'');b.textContent=cat;b.onclick=()=>{document.querySelectorAll('.category-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderMovies('latestMovies',cat==='All'?movies:movies.filter(x=>x.category===cat));document.getElementById('latest').scrollIntoView({behavior:'smooth'})};box.appendChild(b)})
}
function displayTopRated(){const list=[...movies].sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,12);const box=document.getElementById('topRatedMovies');if(!box)return;box.innerHTML='';if(!list.length){box.innerHTML='<div class="empty">No rated movies yet.</div>';return}list.forEach((m,i)=>{const c=document.createElement('div');c.className='movie-card rank-card';const saved=isSaved(m.title);c.innerHTML=`<div class="poster" data-rank="${i+1}"><img src="${safeImage(m.poster_url,moviePlaceholder)}" alt="${escapeHTML(m.title||'Movie')}" loading="lazy"><div class="poster-gradient"></div><div class="rating">⭐ ${escapeHTML(m.rating||'N/A')}</div><div class="quality-badge">TOP ${i+1}</div><button class="quick-view">Quick View</button><button class="my-list ${saved?'saved':''}">${saved?'♥':'＋'}</button></div><div class="movie-info"><div class="movie-title">${escapeHTML(m.title||'Untitled')}</div><div class="movie-meta">${escapeHTML(m.release_year||'N/A')} • ${escapeHTML(m.category||'Movie')}</div></div>`;imageFallback(c.querySelector('img'),moviePlaceholder);c.onclick=()=>showMovieDetails(m);c.querySelector('.quick-view').onclick=e=>{e.stopPropagation();showMovieDetails(m)};c.querySelector('.my-list').onclick=e=>{e.stopPropagation();addToList(m.title);e.currentTarget.classList.toggle('saved',isSaved(m.title));e.currentTarget.textContent=isSaved(m.title)?'♥':'＋'};box.appendChild(c)})}
function displayRecommended(){const historyCats=watchHistory.map(t=>movies.find(m=>m.title===t)?.category).filter(Boolean);const preferred=historyCats[0];let list=[...movies];if(preferred)list.sort((a,b)=>Number(b.category===preferred)-Number(a.category===preferred)||Number(b.rating||0)-Number(a.rating||0));else list.sort((a,b)=>Number(b.rating||0)-Number(a.rating||0));const seen=new Set(watchHistory);list=list.filter(m=>!seen.has(m.title)).slice(0,12);if(!list.length)list=movies.slice(0,12);renderMovies('recommendedMovies',list)}

function displayTrending(){renderMovies('trendingMovies',[...movies].sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,6))}
function displayLatest(){renderMovies('latestMovies',movies.slice(0,12))}

function renderMovies(id,list){
  const box=document.getElementById(id);box.innerHTML='';
  if(!list.length){box.innerHTML='<div class="empty">No movies found.</div>';return;}
  list.forEach(m=>{
    const card=document.createElement('div');card.className='movie-card';const saved=isSaved(m.title);
    card.innerHTML=`<div class="poster"><img src="${safeImage(m.poster_url,moviePlaceholder)}" alt="${escapeHTML(m.title||'Movie')}" loading="lazy"><div class="poster-gradient"></div><div class="rating">⭐ ${escapeHTML(m.rating||'N/A')}</div><div class="quality-badge">CINAMAX</div><button class="quick-view">Quick View</button><button class="my-list ${saved?'saved':''}" aria-label="Add ${escapeHTML(m.title||'movie')} to My List">${saved?'♥':'＋'}</button></div><div class="movie-info"><div class="movie-title">${escapeHTML(m.title||'Untitled')}</div><div class="movie-meta">${escapeHTML(m.release_year||'N/A')} &nbsp;•&nbsp; ${escapeHTML(m.category||'Movie')}</div></div>`;
    const img=card.querySelector('img');imageFallback(img,moviePlaceholder);card.innerHTML=`
<div class="poster">
<img src="${safeImage(m.poster_url,moviePlaceholder)}" 
alt="${escapeHTML(m.title||'Movie')}" loading="lazy">

<div class="poster-gradient"></div>

<div class="rating">
⭐ ${escapeHTML(m.rating||'N/A')}
</div>

<button class="my-list ${saved?'saved':''}">
${saved?'♥':'＋'}
</button>

</div>

<div class="movie-info">

<div class="movie-title">
${escapeHTML(m.title||'Untitled')}
</div>

<div class="movie-meta">
${escapeHTML(m.release_year||'N/A')} 
• 
${escapeHTML(m.category||'Movie')}
</div>


<div class="card-buttons">

<button class="view-btn">
View Movie
</button>



</div>
`;
    card.querySelector('.view-btn').onclick=()=>showMovieDetails(m);card.querySelector('.poster').onclick=()=>showMovieDetails(m);card.querySelector('.my-list').onclick=e=>{e.stopPropagation();addToList(m.title)};box.appendChild(card);
  });
}

function renderSeries(list){
  const box=document.getElementById('seriesGrid');box.innerHTML='';
  if(!list.length){box.innerHTML='<div class="empty">No series found.</div>';return;}
  list.forEach(s=>{
    const c=document.createElement('div');c.className='series-card';
    c.innerHTML=`<div class="series-poster"><img src="${safeImage(s.poster_url,seriesPlaceholder)}" alt="${escapeHTML(s.title||'Series')}" loading="lazy"><div class="series-badge">TV SERIES</div></div><div class="series-info"><div class="series-title">${escapeHTML(s.title||'Untitled Series')}</div><div class="series-meta">⭐ ${escapeHTML(s.rating||'N/A')} &nbsp;•&nbsp; ${escapeHTML(s.release_year||'N/A')} &nbsp;•&nbsp; ${escapeHTML(s.category||'Series')}</div><button class="series-view">View Series</button></div>`;
    imageFallback(c.querySelector('img'),seriesPlaceholder);c.querySelector('.series-view').onclick=()=>showSeriesDetails(s);c.querySelector('.series-poster').onclick=()=>showSeriesDetails(s);box.appendChild(c);
  });
}

function renderSimilar(m){const area=document.getElementById('similarArea'),box=document.getElementById('similarMovies');if(!area||!box)return;let list=movies.filter(x=>x.title!==m.title && x.category && m.category && x.category===m.category).sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,5);if(!list.length)list=movies.filter(x=>x.title!==m.title).sort((a,b)=>Number(b.rating||0)-Number(a.rating||0)).slice(0,5);area.style.display=list.length?'block':'none';box.innerHTML='';list.forEach(x=>{const c=document.createElement('div');c.className='details-mini-card';c.innerHTML=`<img src="${safeImage(x.poster_url,moviePlaceholder)}" alt="${escapeHTML(x.title)}" loading="lazy"><div>${escapeHTML(x.title)}</div>`;imageFallback(c.querySelector('img'),moviePlaceholder);c.onclick=()=>showMovieDetails(x);box.appendChild(c)})}

function showMovieDetails(m){
  selectedMovie=m;saveHistory(m);selectedSeries=null;document.getElementById('home').style.display='none';document.getElementById('hero').style.display='none';document.getElementById('details').style.display='block';
  const poster=document.getElementById('detailsPoster');poster.src=safeImage(m.poster_url,moviePlaceholder);imageFallback(poster,moviePlaceholder);document.getElementById('detailsBackdrop').style.setProperty('--detail-bg', `url("${safeImage(m.poster_url,moviePlaceholder)}")`);
  document.getElementById('detailsTitle').textContent=m.title||'Untitled';document.getElementById('detailsMeta').innerHTML=`⭐ ${escapeHTML(m.rating||'N/A')} &nbsp;•&nbsp; 📅 ${escapeHTML(m.release_year||'N/A')} &nbsp;•&nbsp; 🎬 ${escapeHTML(m.category||'Movie')}`;document.getElementById('detailsDescription').textContent=m.description||'No description available.';document.getElementById('contentNote').style.display='block';document.getElementById('watchButton').style.display='inline-block';document.getElementById('detailListButton').style.display='inline-block';document.getElementById('seriesArea').style.display='none';const tb=document.getElementById('trailerButton');if(m.trailer_url){tb.style.display='inline-block';tb.onclick=()=>openVideo(m.trailer_url)}else{tb.style.display='none'}document.getElementById('detailListButton').textContent=isSaved(m.title)?'♥ In My List':'＋ My List';document.getElementById('detailListButton').onclick=()=>{addToList(m.title);document.getElementById('detailListButton').textContent=isSaved(m.title)?'♥ In My List':'＋ My List'};renderSimilar(m);document.getElementById('nextEpisode').classList.remove('show');window.scrollTo({top:0,behavior:'smooth'});
}

async function showSeriesDetails(s){
  selectedSeries=s;selectedMovie=null;document.getElementById('home').style.display='none';document.getElementById('hero').style.display='none';document.getElementById('details').style.display='block';
  const poster=document.getElementById('detailsPoster');poster.src=safeImage(s.poster_url,seriesPlaceholder);imageFallback(poster,seriesPlaceholder);document.getElementById('detailsBackdrop').style.setProperty('--detail-bg', `url("${safeImage(s.poster_url,seriesPlaceholder)}")`);
  document.getElementById('detailsTitle').textContent=s.title||'Untitled Series';document.getElementById('detailsMeta').innerHTML=`⭐ ${escapeHTML(s.rating||'N/A')} &nbsp;•&nbsp; 📅 ${escapeHTML(s.release_year||'N/A')} &nbsp;•&nbsp; 📺 ${escapeHTML(s.category||'Series')}`;document.getElementById('detailsDescription').textContent=s.description||'No description available.';document.getElementById('contentNote').style.display='block';document.getElementById('watchButton').style.display='none';document.getElementById('trailerButton').style.display='none';document.getElementById('detailListButton').style.display='none';document.getElementById('seriesArea').style.display='block';document.getElementById('similarArea').style.display='none';document.getElementById('nextEpisode').classList.remove('show');document.getElementById('episodeList').innerHTML='<div class="loading">Loading seasons...</div>';
  const {data:seasonsData,error:seasonError}=await supabaseClient.from('Seasons').select('*').eq('series_id',s.id).order('season_number',{ascending:true});
  if(seasonError){console.error(seasonError);document.getElementById('episodeList').innerHTML='<div class="error-box">Unable to load seasons.</div>';return}
  seasons=seasonsData||[];renderSeasonTabs();
  if(seasons.length){selectSeason(seasons[0])}else{document.getElementById('seasonDescription').textContent='';document.getElementById('episodeList').innerHTML='<div class="empty">No seasons added yet.</div>'}
  window.scrollTo({top:0,behavior:'smooth'});
}
function renderSeasonTabs(){const box=document.getElementById('seasonTabs');box.innerHTML='';seasons.forEach((s,i)=>{const b=document.createElement('button');b.className='season-btn'+(i===0?' active':'');b.textContent=s.title||`Season ${s.season_number}`;b.onclick=()=>{document.querySelectorAll('.season-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');selectSeason(s)};box.appendChild(b)})}
function selectSeason(s){currentSeasonId=s.id;document.getElementById('seasonDescription').textContent=s.description||'';loadEpisodes(s.id)}

async function loadEpisodes(seasonId){
  const box=document.getElementById('episodeList');box.innerHTML='<div class="loading">Loading episodes...</div>';
  const {data,error}=await supabaseClient.from('Episodes').select('*').eq('season_id',seasonId).eq('published',true).order('episode_number',{ascending:true});
  if(error){console.error(error);box.innerHTML='<div class="error-box">Unable to load episodes.</div>';return}
  episodes=data||[];if(!episodes.length){box.innerHTML='<div class="empty">No episodes published yet.</div>';return}box.innerHTML='';
  episodes.forEach((ep,idx)=>{const row=document.createElement('div');row.className='episode'+(isEpisodeWatched(ep.id)?' is-watched':'');row.innerHTML=`<img class="episode-thumb" src="${safeImage(ep.thumbnail_url,seriesPlaceholder)}" alt="${escapeHTML(ep.title||'Episode')}" loading="lazy"><div class="episode-info"><div class="episode-number">EPISODE ${escapeHTML(ep.episode_number)}</div><div class="episode-title">${escapeHTML(ep.title||'Untitled Episode')}</div><div class="episode-description">${escapeHTML(ep.description||'')}${ep.duration?' • '+escapeHTML(ep.duration):''}</div></div><button class="episode-watch">${isEpisodeWatched(ep.id)?'↻ Watch Again':'▶ Watch'}</button>`;imageFallback(row.querySelector('img'),seriesPlaceholder);row.querySelector('.episode-watch').onclick=()=>watchEpisode(ep);box.appendChild(row)});setNextEpisode();
}

function getWatchedEpisodes(){try{return JSON.parse(localStorage.getItem('movieCinamaxWatchedEpisodes')||'[]')}catch{return []}}
function isEpisodeWatched(id){return getWatchedEpisodes().includes(String(id))}
function markEpisodeWatched(id){const x=getWatchedEpisodes();const k=String(id);if(!x.includes(k))x.push(k);localStorage.setItem('movieCinamaxWatchedEpisodes',JSON.stringify(x.slice(-200)))}
function setNextEpisode(){const box=document.getElementById('nextEpisode');if(!box||!episodes.length){box?.classList.remove('show');return}const next=episodes.find(ep=>!isEpisodeWatched(ep.id));if(!next){box.classList.remove('show');return}document.getElementById('nextEpisodeTitle').textContent=`Episode ${next.episode_number} • ${next.title||'Untitled Episode'}`;document.getElementById('nextEpisodeButton').onclick=()=>watchEpisode(next);box.classList.add('show')}
function watchEpisode(ep){if(selectedSeries)saveHistory(selectedSeries);if(!ep.video_url){alert('මේ episode එකට Video URL එකක් තාම දාලා නැහැ.');return}markEpisodeWatched(ep.id);setNextEpisode();openVideo(ep.video_url)}
function openVideo(url){if(selectedMovie)saveHistory(selectedMovie);const frame=document.getElementById('videoFrame');frame.src=getVideoUrl(url);document.getElementById('videoModal').classList.add('active');document.getElementById('closeVideo').focus()}
document.getElementById('watchButton').onclick=()=>{if(!selectedMovie)return;if(!selectedMovie.video_url){alert('මේ movie එකට Video URL එකක් තාම දාලා නැහැ.');return}openVideo(selectedMovie.video_url)};
function closeVideo(){document.getElementById('videoModal').classList.remove('active');document.getElementById('videoFrame').src=''}
document.getElementById('closeVideo').onclick=closeVideo;document.getElementById('videoModal').onclick=e=>{if(e.target===e.currentTarget)closeVideo()};document.addEventListener('keydown',e=>{if(e.key==='Escape')closeVideo()});

function getMyList(){try{return JSON.parse(localStorage.getItem('movieCinamaxMyList'))||[]}catch{return []}}
function saveMyList(x){localStorage.setItem('movieCinamaxMyList',JSON.stringify(x))}
function isSaved(t){return getMyList().includes(t)}
function addToList(t){let x=getMyList();x=x.includes(t)?x.filter(i=>i!==t):[...x,t];saveMyList(x);displayMyList();displayTrending();displayTopRated();displayRecommended();displayLatest()}
function displayMyList(){const saved=movies.filter(m=>getMyList().includes(m.title));const box=document.getElementById('myListMovies');if(!saved.length){box.innerHTML='<div class="empty">Your My List is empty. Tap ＋ on a movie to save it.</div>';return}renderMovies('myListMovies',saved)}

let searchTimer=null;
function updateSearchResults(v){const panel=document.getElementById('searchResults');if(!panel)return;if(!v){panel.classList.remove('active');panel.innerHTML='';return}const ms=movies.filter(m=>`${m.title||''} ${m.category||''} ${m.description||''}`.toLowerCase().includes(v)).slice(0,5);const ss=series.filter(x=>`${x.title||''} ${x.category||''} ${x.description||''}`.toLowerCase().includes(v)).slice(0,5);let html='';if(ms.length){html+='<div class="search-group-title">MOVIES</div>';ms.forEach(m=>html+=`<div class="search-result" data-type="movie" data-title="${escapeHTML(m.title)}"><img src="${safeImage(m.poster_url,moviePlaceholder)}" alt=""><div><strong>${escapeHTML(m.title)}</strong><small>⭐ ${escapeHTML(m.rating||'N/A')} • ${escapeHTML(m.release_year||'N/A')} • ${escapeHTML(m.category||'Movie')}</small></div></div>`)}if(ss.length){html+='<div class="search-group-title">SERIES</div>';ss.forEach(x=>html+=`<div class="search-result" data-type="series" data-title="${escapeHTML(x.title)}"><img src="${safeImage(x.poster_url,seriesPlaceholder)}" alt=""><div><strong>${escapeHTML(x.title)}</strong><small>⭐ ${escapeHTML(x.rating||'N/A')} • ${escapeHTML(x.release_year||'N/A')} • ${escapeHTML(x.category||'Series')}</small></div></div>`)}if(!html)html='<div class="empty">No matching movies or series.</div>';panel.innerHTML=html;panel.classList.add('active');panel.querySelectorAll('.search-result').forEach(r=>r.onclick=()=>{const item=(r.dataset.type==='movie'?movies:series).find(x=>x.title===r.dataset.title);panel.classList.remove('active');r.dataset.type==='movie'?showMovieDetails(item):showSeriesDetails(item)});panel.querySelectorAll('img').forEach(img=>imageFallback(img,moviePlaceholder))}
document.getElementById('searchInput').addEventListener('input',function(){clearTimeout(searchTimer);const v=this.value.toLowerCase().trim();updateSearchResults(v);searchTimer=setTimeout(()=>{if(!v){displayTrending();renderSeries(series);displayLatest();return}const movieResults=movies.filter(m=>(m.title||'').toLowerCase().includes(v)||(m.category||'').toLowerCase().includes(v)||(m.description||'').toLowerCase().includes(v));const seriesResults=series.filter(s=>(s.title||'').toLowerCase().includes(v)||(s.category||'').toLowerCase().includes(v)||(s.description||'').toLowerCase().includes(v));renderMovies('trendingMovies',movieResults);renderSeries(seriesResults);renderMovies('latestMovies',movieResults);},180)});
document.addEventListener('click',e=>{const panel=document.getElementById('searchResults');if(panel&&!panel.contains(e.target)&&!e.target.closest('.search'))panel.classList.remove('active')});


document.getElementById('movieRequestForm')?.addEventListener('submit',e=>{e.preventDefault();const title=document.getElementById('requestTitle').value.trim();const note=document.getElementById('requestNote').value.trim();if(!title)return;const subject=encodeURIComponent(`Movie Request - ${title}`);const body=encodeURIComponent(`Requested title: ${title}\n\nNote: ${note||'No additional note.'}`);window.location.href=`mailto:janiruransana226@gmail.com?subject=${subject}&body=${body}`;toast('Request email opened ✉')});

function showHome(){document.getElementById('details').style.display='none';document.getElementById('home').style.display='block';document.getElementById('hero').style.display='block';window.scrollTo({top:0,behavior:'smooth'})}
window.addEventListener('scroll',()=>document.getElementById('header').classList.toggle('scrolled',window.scrollY>50));
document.getElementById('movieSort')?.addEventListener('change',function(){
  const mode=this.value;
  let list=[...movies];
  if(mode==='rating') list.sort((a,b)=>Number(b.rating||0)-Number(a.rating||0));
  else if(mode==='title') list.sort((a,b)=>String(a.title||'').localeCompare(String(b.title||'')));
  else list.sort((a,b)=>Number(b.release_year||0)-Number(a.release_year||0));
  renderMovies('latestMovies',list.slice(0,12));
});

function updateQuickStats(){
  document.getElementById('movieCount').textContent=movies.length;
  document.getElementById('seriesCount').textContent=series.length;
  document.getElementById('categoryCount').textContent=new Set([...movies.map(x=>x.category),...series.map(x=>x.category)].filter(Boolean)).size;
}

// Keyboard-friendly search: press / to focus search.
document.addEventListener('keydown',e=>{
  if(e.key==='/' && document.activeElement?.tagName!=='INPUT' && document.activeElement?.tagName!=='TEXTAREA'){e.preventDefault();document.getElementById('searchInput')?.focus()}
  if(e.key==='Escape')document.getElementById('searchResults')?.classList.remove('active')
});

initProfile();loadMovies().then(()=>{initAdvancedFilters();renderContinue();displayTopRated();displayRecommended()});loadSeries();
