import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Données d'artistes avec leurs genres associés (pour référence)
const artistsData = [
  // Pop
  { name: "Taylor Swift", genre: "Pop" },
  { name: "Dua Lipa", genre: "Pop" },
  { name: "The Weeknd", genre: "Pop" },
  { name: "Billie Eilish", genre: "Pop" },
  { name: "Ariana Grande", genre: "Pop" },
  
  // Rock
  { name: "The Beatles", genre: "Rock" },
  { name: "Radiohead", genre: "Rock" },
  { name: "Arctic Monkeys", genre: "Rock" },
  { name: "Tame Impala", genre: "Rock" },
  { name: "The Strokes", genre: "Rock" },
  
  // Hip-Hop/Rap
  { name: "Kendrick Lamar", genre: "Hip-Hop" },
  { name: "Drake", genre: "Hip-Hop" },
  { name: "Tyler, The Creator", genre: "Hip-Hop" },
  { name: "Travis Scott", genre: "Hip-Hop" },
  { name: "J. Cole", genre: "Hip-Hop" },
  
  // Electronic
  { name: "Daft Punk", genre: "Electronic" },
  { name: "Deadmau5", genre: "Electronic" },
  { name: "Aphex Twin", genre: "Electronic" },
  { name: "Justice", genre: "Electronic" },
  { name: "Skrillex", genre: "Electronic" },
  
  // Jazz
  { name: "Miles Davis", genre: "Jazz" },
  { name: "John Coltrane", genre: "Jazz" },
  { name: "Herbie Hancock", genre: "Jazz" },
  { name: "Kamasi Washington", genre: "Jazz" },
  { name: "Esperanza Spalding", genre: "Jazz" },
  
  // Indie
  { name: "Bon Iver", genre: "Indie" },
  { name: "Fleet Foxes", genre: "Indie" },
  { name: "Phoebe Bridgers", genre: "Indie" },
  { name: "Mac DeMarco", genre: "Indie" },
  { name: "Beach House", genre: "Indie" },
];

// Tracks pour chaque artiste
const tracksByArtist: Record<string, string[]> = {
  "Taylor Swift": ["Anti-Hero", "Cruel Summer", "Cardigan", "All Too Well", "Shake It Off"],
  "Dua Lipa": ["Levitating", "Don't Start Now", "Physical", "New Rules", "One Kiss"],
  "The Weeknd": ["Blinding Lights", "Save Your Tears", "Starboy", "The Hills", "Can't Feel My Face"],
  "Billie Eilish": ["bad guy", "everything i wanted", "Happier Than Ever", "bury a friend", "when the party's over"],
  "Ariana Grande": ["7 rings", "thank u, next", "positions", "Side to Side", "no tears left to cry"],
  
  "The Beatles": ["Hey Jude", "Come Together", "Let It Be", "Yesterday", "Here Comes The Sun"],
  "Radiohead": ["Creep", "Karma Police", "Paranoid Android", "No Surprises", "Exit Music"],
  "Arctic Monkeys": ["Do I Wanna Know?", "R U Mine?", "505", "Fluorescent Adolescent", "Arabella"],
  "Tame Impala": ["The Less I Know The Better", "Let It Happen", "Borderline", "Lost In Yesterday", "Is It True"],
  "The Strokes": ["Last Nite", "Reptilia", "Someday", "You Only Live Once", "Under Cover of Darkness"],
  
  "Kendrick Lamar": ["HUMBLE.", "Alright", "DNA.", "Swimming Pools", "King Kunta"],
  "Drake": ["God's Plan", "In My Feelings", "Hotline Bling", "One Dance", "Started From The Bottom"],
  "Tyler, The Creator": ["EARFQUAKE", "See You Again", "Yonkers", "Who Dat Boy", "IFHY"],
  "Travis Scott": ["SICKO MODE", "goosebumps", "Antidote", "Highest In The Room", "STARGAZING"],
  "J. Cole": ["No Role Modelz", "Middle Child", "Work Out", "Power Trip", "Love Yourz"],
  
  "Daft Punk": ["One More Time", "Get Lucky", "Harder, Better, Faster, Stronger", "Around The World", "Digital Love"],
  "Deadmau5": ["Strobe", "Ghosts 'n' Stuff", "I Remember", "The Veldt", "Raise Your Weapon"],
  "Aphex Twin": ["Avril 14th", "Windowlicker", "Come To Daddy", "Flim", "Xtal"],
  "Justice": ["D.A.N.C.E.", "We Are Your Friends", "Civilization", "Safe and Sound", "Genesis"],
  "Skrillex": ["Bangarang", "Scary Monsters and Nice Sprites", "First of the Year", "Recess", "Make It Bun Dem"],
  
  "Miles Davis": ["So What", "Blue in Green", "Kind of Blue", "All Blues", "Flamenco Sketches"],
  "John Coltrane": ["Giant Steps", "A Love Supreme", "My Favorite Things", "Naima", "Blue Train"],
  "Herbie Hancock": ["Cantaloupe Island", "Watermelon Man", "Chameleon", "Rockit", "Maiden Voyage"],
  "Kamasi Washington": ["The Truth", "Fists of Fury", "Street Fighter Mas", "The Rhythm Changes", "Henrietta Our Hero"],
  "Esperanza Spalding": ["I Know You Know", "Little Fly", "Black Gold", "Cinnamon Tree", "Formwela 3"],
  
  "Bon Iver": ["Holocene", "Skinny Love", "For Emma", "Flume", "re: stacks"],
  "Fleet Foxes": ["White Winter Hymnal", "Mykonos", "Helplessness Blues", "Ragged Wood", "The Shrine"],
  "Phoebe Bridgers": ["Kyoto", "Motion Sickness", "Garden Song", "I Know The End", "Moon Song"],
  "Mac DeMarco": ["Chamber of Reflection", "My Kind of Woman", "Salad Days", "Ode to Viceroy", "Freaking Out the Neighborhood"],
  "Beach House": ["Space Song", "Myth", "Lazuli", "Silver Soul", "Take Care"],
};

async function main() {
  console.log("🌱 Début du seed de la base de données...");

  // Nettoyer les données existantes (optionnel, commentez si vous voulez conserver les données)
  console.log("🧹 Nettoyage des données existantes...");
  await prisma.listen.deleteMany();
  await prisma.track.deleteMany();
  await prisma.artist.deleteMany();
  await prisma.user.deleteMany();

  // Créer un utilisateur de test
  console.log("👤 Création de l'utilisateur...");
  const user = await prisma.user.create({
    data: {
      email: "user@example.com",
      name: "Test User",
    },
  });

  // Créer les artistes
  console.log("🎤 Création des artistes...");
  const artists = await Promise.all(
    artistsData.map((artistData) =>
      prisma.artist.create({
        data: {
          name: artistData.name,
        },
      })
    )
  );

  // Créer les tracks
  console.log("🎵 Création des tracks...");
  const allTracks = [];
  for (const artist of artists) {
    const trackTitles = tracksByArtist[artist.name] || [];
    for (const title of trackTitles) {
      const track = await prisma.track.create({
        data: {
          title,
          artistId: artist.id,
          duration: Math.floor(Math.random() * 240) + 120, // 2-6 minutes
        },
      });
      allTracks.push(track);
    }
  }

  // Créer les listens sur plusieurs mois
  console.log("📊 Création des listens (cela peut prendre un moment)...");
  const now = new Date();
  const threeMonthsAgo = new Date(now);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const listens = [];
  const totalDays = Math.floor((now.getTime() - threeMonthsAgo.getTime()) / (1000 * 60 * 60 * 24));

  // Générer des listens avec une distribution réaliste
  // Plus d'écoutes récentes, avec des pics certains jours
  for (let day = 0; day < totalDays; day++) {
    const date = new Date(threeMonthsAgo);
    date.setDate(date.getDate() + day);
    
    // Nombre d'écoutes par jour (variable, avec des pics certains jours)
    const baseListens = 15;
    const dayOfWeek = date.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const listensPerDay = isWeekend 
      ? baseListens + Math.floor(Math.random() * 30) // Plus d'écoutes le weekend
      : baseListens + Math.floor(Math.random() * 20);
    
    // Parfois un pic d'écoute (journée spéciale)
    const isPeakDay = Math.random() < 0.1; // 10% de chance
    const finalListensPerDay = isPeakDay ? listensPerDay * 2 : listensPerDay;

    // Répartition des écoutes dans la journée
    for (let i = 0; i < finalListensPerDay; i++) {
      const hour = Math.floor(Math.random() * 24);
      const minute = Math.floor(Math.random() * 60);
      const second = Math.floor(Math.random() * 60);
      
      const playedAt = new Date(date);
      playedAt.setHours(hour, minute, second, 0);

      // Sélectionner une track aléatoire
      const randomTrack = allTracks[Math.floor(Math.random() * allTracks.length)];
      
      // Source aléatoire (70% lastfm, 30% apple_music_replay)
      const source = Math.random() < 0.7 ? "lastfm" : "apple_music_replay";

      listens.push({
        userId: user.id,
        trackId: randomTrack.id,
        playedAt,
        source,
      });
    }
  }

  // Insérer les listens par batch pour de meilleures performances
  const batchSize = 1000;
  console.log(`📥 Insertion de ${listens.length} listens en batches de ${batchSize}...`);
  
  for (let i = 0; i < listens.length; i += batchSize) {
    const batch = listens.slice(i, i + batchSize);
    await prisma.listen.createMany({
      data: batch,
    });
    console.log(`   ✓ ${Math.min(i + batchSize, listens.length)}/${listens.length} listens insérées`);
  }

  // Statistiques finales
  const stats = {
    users: await prisma.user.count(),
    artists: await prisma.artist.count(),
    tracks: await prisma.track.count(),
    listens: await prisma.listen.count(),
  };

  console.log("\n✅ Seed terminé avec succès!");
  console.log("📊 Statistiques:");
  console.log(`   - Utilisateurs: ${stats.users}`);
  console.log(`   - Artistes: ${stats.artists}`);
  console.log(`   - Tracks: ${stats.tracks}`);
  console.log(`   - Listens: ${stats.listens}`);
  console.log(`   - Période: ${threeMonthsAgo.toLocaleDateString()} → ${now.toLocaleDateString()}`);
}

main()
  .catch((e) => {
    console.error("❌ Erreur lors du seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

