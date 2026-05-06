import { SignIn, SignUp, useUser } from '@clerk/react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'

export default function ClientLogin() {
  const navigate = useNavigate()
  const { isSignedIn, user } = useUser()
  const [isSignup, setIsSignup] = useState(false)

  useEffect(() => {
    if (isSignedIn && user) {
      syncUserWithBackend(user)
    }
  }, [isSignedIn, user])

  const syncUserWithBackend = async (clerkUser) => {
    try {
      const res = await fetch('https://appointease-03wm.onrender.com/api/auth/user/clerk-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: clerkUser.id,
          name: clerkUser.fullName || clerkUser.firstName + ' ' + clerkUser.lastName,
          email: clerkUser.primaryEmailAddress?.emailAddress,
          phone: clerkUser.primaryPhoneNumber?.phoneNumber || ''
        })
      })
      const data = await res.json()
      if (data.token) {
        localStorage.setItem('clientToken', data.token)
        localStorage.setItem('client', JSON.stringify(data.user))
        navigate('/client/dashboard')
      }
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-6 flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-lg">A</span>
        </div>
        <span className="text-xl font-bold text-slate-800">AppointEase</span>
      </div>

      {isSignup ? (
        <>
          <SignUp
            appearance={{
              elements: {
                rootBox: 'w-full max-w-md',
                card: 'shadow-none border border-slate-200 rounded-2xl',
                headerTitle: 'text-slate-800',
                headerSubtitle: 'text-slate-500',
                socialButtonsBlockButton: 'border border-slate-300 hover:bg-slate-50',
                formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
                footerActionLink: 'text-indigo-600'
              }
            }}
            redirectUrl="/client/dashboard"
          />
          <p className="text-slate-500 text-sm mt-4">
            Already have an account?{' '}
            <button onClick={() => setIsSignup(false)} className="text-indigo-600 font-medium">Sign in</button>
          </p>
        </>
      ) : (
        <>
          <SignIn
            appearance={{
              elements: {
                rootBox: 'w-full max-w-md',
                card: 'shadow-none border border-slate-200 rounded-2xl',
                headerTitle: 'text-slate-800',
                headerSubtitle: 'text-slate-500',
                socialButtonsBlockButton: 'border border-slate-300 hover:bg-slate-50',
                formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700',
                footerActionLink: 'text-indigo-600'
              }
            }}
            redirectUrl="/client/dashboard"
          />
          <p className="text-slate-500 text-sm mt-4">
            Don't have an account?{' '}
            <button onClick={() => setIsSignup(true)} className="text-indigo-600 font-medium">Sign up</button>
          </p>
        </>
      )}
    </div>
  )
}
