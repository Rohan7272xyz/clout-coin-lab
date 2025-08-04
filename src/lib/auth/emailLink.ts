// src/lib/auth/emailLink.ts
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { auth } from '../firebase';

const actionCodeSettings = {
  // URL you want to redirect back to after the user clicks the link in their email
  url: window.location.origin + '/signin',
  handleCodeInApp: true,
};

export const sendMagicLink = async (email: string) => {
  await sendSignInLinkToEmail(auth, email, actionCodeSettings);
  window.localStorage.setItem('emailForSignIn', email);
};

export const completeMagicLinkSignIn = async (email?: string) => {
  if (!email) {
    email = window.localStorage.getItem('emailForSignIn') || '';
  }
  return await signInWithEmailLink(auth, email, window.location.href);
};

export const isMagicLink = () => isSignInWithEmailLink(auth, window.location.href);
