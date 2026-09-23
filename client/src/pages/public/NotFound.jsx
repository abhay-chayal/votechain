import { Button } from '../../components/ui'

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <div className="font-mono text-6xl font-bold text-primary">404</div>
      <h1 className="mt-4 text-xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted">The page or election you're looking for doesn't exist or isn't public yet.</p>
      <Button to="/" className="mt-6">Back to home</Button>
    </div>
  )
}
