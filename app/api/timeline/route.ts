import { NextResponse } from "next/server";

// Route API pour récupérer les données de timeline d'écoute
// Actuellement utilise des données mockées pour la démonstration
// Dans une vraie application, utiliserait Prisma pour interroger la base de données
function generateMockTimelineData() {
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split("T")[0],
      listens: Math.floor(Math.random() * 50) + 10,
    });
  }
  
  return data;
}

export async function GET() {
  try {
    const data = generateMockTimelineData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching timeline data:", error);
    return NextResponse.json(
      { error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}

