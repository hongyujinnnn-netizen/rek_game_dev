'use server';

import { redirect } from 'next/navigation';
import { signInPlayer, signUpPlayer, setAuthCookies } from '@/lib/leungRekAuth';

export async function loginAction(prevState: any, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  if (!email || !password) {
    return { error: 'Email and password are required.' };
  }

  try {
    const { accessToken, refreshToken } = await signInPlayer(email, password);
    await setAuthCookies(accessToken, refreshToken);
  } catch (error: any) {
    return { error: error.message || 'Failed to login' };
  }

  redirect('/');
}

export async function registerAction(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!name || !email || !password || !confirmPassword) {
    return { error: 'All fields are required.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  try {
    const { accessToken, refreshToken } = await signUpPlayer(email, password, name);
    await setAuthCookies(accessToken, refreshToken);
  } catch (error: any) {
    return { error: error.message || 'Failed to register' };
  }

  redirect('/');
}
