import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Music } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex flex-col items-center justify-center px-4">
      <Music className="h-16 w-16 text-muted-foreground/30 mb-6" />
      <h1 className="font-serif text-4xl font-bold mb-3" data-testid="text-404-title">
        Lost in the Desert
      </h1>
      <p className="text-muted-foreground text-center max-w-md mb-8">
        Looks like you've wandered off the trail. This page doesn't exist,
        but the road home is just a click away.
      </p>
      <Link href="/">
        <Button data-testid="button-go-home">Head Back Home</Button>
      </Link>
    </div>
  );
}
