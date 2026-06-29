import { NextResponse } from 'next/server';
import { sql, runAutoMigrations } from '@/lib/neon';

export async function GET() {
  try {
    if (!sql) {
      return NextResponse.json({ 
        connected: false, 
        error: 'DATABASE_URL is missing in env. Next.js must be restarted to load new variables.' 
      });
    }
    
    const timeResult = await sql`SELECT NOW() as now`;
    await runAutoMigrations();
    
    return NextResponse.json({ 
      connected: true, 
      time: timeResult[0].now,
      message: 'Neon PostgreSQL is successfully connected! Auto-migrations verified.'
    });
  } catch (err: any) {
    console.error('Diagnostic DB connection error:', err);
    return NextResponse.json({ 
      connected: false, 
      error: err.message 
    }, { status: 500 });
  }
}
