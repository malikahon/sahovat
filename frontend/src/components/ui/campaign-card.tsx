import * as React from "react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Heart, Clock, Users, BadgeCheck } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { formatUZS } from "@/lib/formatters"

export interface CampaignCardProps {
  id: string
  title: string
  description: string
  category: string
  categoryLabel?: string
  imageUrl: string
  raisedAmount: number
  goalAmount: number
  daysLeft: number | null
  donorCount: number
  isVerified?: boolean
  creatorName?: string
  variant?: "default" | "compact" | "featured"
}

export function CampaignCard({
  id,
  title,
  description,
  category,
  categoryLabel,
  imageUrl,
  raisedAmount,
  goalAmount,
  daysLeft,
  donorCount,
  isVerified = false,
  creatorName,
  variant = "default",
}: CampaignCardProps) {
  const progressPercentage = Math.min(
    Math.round((raisedAmount / goalAmount) * 100),
    100
  )

  if (variant === "featured") {
    return (
      <Card className="group/campaign relative flex flex-col overflow-hidden border-sage-200/50 bg-card shadow-warm-md transition-all hover:shadow-warm-lg md:flex-row">
        {/* Image side */}
        <div className="relative aspect-[16/10] w-full overflow-hidden md:aspect-auto md:w-1/2">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover transition-transform duration-500 group-hover/campaign:scale-105"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sage-100">
              <Heart className="h-12 w-12 text-sage-300" />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent md:bg-gradient-to-r" />
          <Badge
            className="absolute left-3 top-3 border-0 bg-sage-600/90 text-white backdrop-blur-sm"
            variant="default"
          >
            {categoryLabel || category}
          </Badge>
        </div>

        {/* Content side */}
        <div className="flex flex-1 flex-col justify-between p-6 md:p-8">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-foreground leading-tight md:text-2xl">
                {title}
              </h3>
              {isVerified && (
                <BadgeCheck className="h-5 w-5 shrink-0 text-sage-500" />
              )}
            </div>
            {creatorName && (
              <p className="mt-1 text-sm text-muted-foreground">
                by {creatorName}
              </p>
            )}
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground line-clamp-3">
              {description}
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-sage-600">{formatUZS(raisedAmount)}</span>
                <span className="text-muted-foreground">
                  of {formatUZS(goalAmount)}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2.5" />
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {donorCount} donors
              </span>
              {daysLeft !== null && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> {daysLeft} days left
                </span>
              )}
              <span className="font-semibold text-sage-600">
                {progressPercentage}%
              </span>
            </div>

            {/* CTA */}
            <Button className="w-full shadow-warm-sm" size="lg" asChild>
              <Link href={`/campaigns/${id}`}>
                <Heart className="mr-2 h-4 w-4" />
                Donate Now
              </Link>
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (variant === "compact") {
    return (
      <Card className="group/campaign flex overflow-hidden border-border/50 bg-card shadow-warm-xs transition-all hover:shadow-warm-sm">
        {/* Thumbnail */}
        <div className="relative aspect-square w-24 shrink-0 overflow-hidden sm:w-28">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="112px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-sage-100">
              <Heart className="h-5 w-5 text-sage-300" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground line-clamp-1">
              {title}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
              {formatUZS(raisedAmount)} of {formatUZS(goalAmount)}
            </p>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className="group/campaign flex flex-col overflow-hidden border-border/50 bg-card shadow-warm-xs transition-all hover:shadow-warm-md hover:-translate-y-0.5">
      {/* Image */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover/campaign:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-sage-100">
            <Heart className="h-8 w-8 text-sage-300" />
          </div>
        )}
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        <Badge
          className="absolute right-3 top-3 border-0 bg-background/85 text-foreground backdrop-blur-sm shadow-warm-xs"
          variant="secondary"
        >
          {categoryLabel || category}
        </Badge>
        {isVerified && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-sage-600/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
            <BadgeCheck className="h-3 w-3" />
            Verified
          </div>
        )}
      </div>

      <CardHeader className="p-4 pb-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold text-foreground line-clamp-1 leading-tight">
            {title}
          </h3>
        </div>
        {creatorName && (
          <p className="text-xs text-muted-foreground">by {creatorName}</p>
        )}
        <p className="mt-1 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      </CardHeader>

      <CardContent className="flex-grow p-4 pt-3">
        <div className="space-y-3">
          {/* Progress section */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-sm font-semibold">
              <span className="text-sage-600">{formatUZS(raisedAmount)}</span>
              <span className="text-muted-foreground">
                {formatUZS(goalAmount)}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> {donorCount} donors
            </span>
            {daysLeft !== null && (
              <span className="flex items-center gap-1 font-medium">
                <Clock className="h-3.5 w-3.5" /> {daysLeft} days left
              </span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button className="w-full font-medium shadow-warm-xs" size="sm" asChild>
          <Link href={`/campaigns/${id}`} className="w-full">
            <Heart className="mr-1.5 h-3.5 w-3.5" />
            Donate Now
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
