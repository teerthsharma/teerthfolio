import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8 text-center">
        Next.js + shadcn/ui Setup Complete!
      </h1>
      <p className="text-lg text-muted-foreground mb-8 text-center">
        Your project is ready with Tailwind CSS v4 and shadcn/ui.
      </p>
      <div className="flex gap-4">
        <Button>Get Started</Button>
        <Button variant="outline">Learn More</Button>
      </div>
    </div>
  );
}
