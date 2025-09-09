"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, AlertTriangle } from "lucide-react"

type Feedback = { 
  score: number
  strengths: string | string[] 
  improvements: string | string[] 
}

export function FeedbackCard({ feedback }: { feedback: Feedback }) {
  console.log("Raw feedback from backend:", feedback)

  const { score, strengths, improvements } = feedback

  // ✅ Normalize to arrays
  const strengthsArr = Array.isArray(strengths) ? strengths : [strengths].filter(Boolean)
  const improvementsArr = Array.isArray(improvements) ? improvements : [improvements].filter(Boolean)

  console.log("Normalized feedback:", { score, strengthsArr, improvementsArr })

  return (
    <Card className="border-emerald-600/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Score <Badge variant="secondary">{score} / 10</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        
        {/* Strengths Section */}
        <div>
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            Strengths
          </div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {strengthsArr.length ? (
              strengthsArr.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li className="text-muted-foreground">No strengths detected yet.</li>
            )}
          </ul>
        </div>

        {/* Improvements Section */}
        <div>
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            Improvements
          </div>
          <ul className="mt-2 list-disc pl-5 space-y-1">
            {improvementsArr.length ? (
              improvementsArr.map((s, i) => <li key={i}>{s}</li>)
            ) : (
              <li className="text-muted-foreground">No improvements suggested.</li>
            )}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
// "use client"

// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// import { Badge } from "@/components/ui/badge"
// import { CheckCircle2, AlertTriangle } from "lucide-react"

// type Feedback = { score: number; strengths: string[]; improvements: string[] }

// export function FeedbackCard({ feedback }: { feedback: Feedback }) {
//   // Log the raw feedback object
//   console.log("FeedbackCard received:", feedback)
//   const { score, strengths = [], improvements = [] } = feedback

//   return (
//     <Card className="border-emerald-600/20">
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2">
//           Score <Badge variant="secondary">{score} / 10</Badge>
//         </CardTitle>
//       </CardHeader>
//       <CardContent className="grid gap-4 md:grid-cols-2">
//         <div>
//           <div className="flex items-center gap-2 font-medium">
//             <CheckCircle2 className="h-4 w-4 text-emerald-600" />
//             Strengths
//           </div>
//           <ul className="mt-2 list-disc pl-5 space-y-1">
//             {strengths.length ? (
//               strengths.map((s, i) => <li key={i}>{s}</li>)
//             ) : (
//               <li className="text-muted-foreground">No strengths detected yet.</li>
//             )}
//           </ul>
//         </div>
//         <div>
//           <div className="flex items-center gap-2 font-medium">
//             <AlertTriangle className="h-4 w-4 text-red-600" />
//             Improvements
//           </div>
//           <ul className="mt-2 list-disc pl-5 space-y-1">
//             {improvements.length ? (
//               improvements.map((s, i) => <li key={i}>{s}</li>)
//             ) : (
//               <li className="text-muted-foreground">No improvements suggested.</li>
//             )}
//           </ul>
//         </div>
//       </CardContent>
//     </Card>
//   )
// }