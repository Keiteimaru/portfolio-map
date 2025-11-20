import { NextResponse } from 'next/server';

export function middleware(req) {
  const auth = req.headers.get('authorization');

  const USER = process.env.BASIC_USER;
  const PASS = process.env.BASIC_PASS;

  if (auth) {
    const [user, pass] = atob(auth.split(' ')[1]).split(':');
    if (user === USER && pass === PASS) {
      return NextResponse.next();
    }
  }

  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
  });
}