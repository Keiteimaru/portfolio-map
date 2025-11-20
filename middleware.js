import { NextResponse } from 'next/server'

export function middleware(req) {
  const basicAuth = req.headers.get("authorization");

  // ユーザー名とパスワードは環境変数から
  const user = process.env.BASIC_USER;
  const pass = process.env.BASIC_PASS;

  // 認証がある場合のチェック
  if (basicAuth) {
    const authValue = basicAuth.split(" ")[1];
    const [inputUser, inputPass] = atob(authValue).split(":");

    if (inputUser === user && inputPass === pass) {
      return NextResponse.next();
    }
  }

  // 認証失敗 → ベーシック認証を要求
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="Secure Area"`,
    },
  });
}