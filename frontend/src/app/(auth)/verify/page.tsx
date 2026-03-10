import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { VerifyForm } from './verify-form';

function VerifyFallback() {
  return (
    <div className="flex items-center justify-center w-full max-w-md p-8">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<VerifyFallback />}>
      <VerifyForm />
    </Suspense>
  );
}
