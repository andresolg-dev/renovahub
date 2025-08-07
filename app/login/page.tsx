import LoginForm from "@/components/login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <h1 className="text-5xl font-extrabold text-primary mb-8 tracking-tight">
        Renova<span className="text-foreground">Hub</span>
      </h1>
      <LoginForm />
    </div>
  )
}
