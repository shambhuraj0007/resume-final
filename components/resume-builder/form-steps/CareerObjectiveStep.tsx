import { Textarea } from "@/components/ui/textarea";
import { Label } from "@radix-ui/react-dropdown-menu";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { FormValues } from "../types";

interface CareerObjectiveStepProps {
    register: UseFormRegister<FormValues>;
    errors: FieldErrors<FormValues>;
}
export const CareerObjectiveStep: React.FC<CareerObjectiveStepProps> = ({ register, errors }) => {
    return(
        <div className="space-y-4">
        <div className="space-y-2">
          <Label>Career Objective</Label>
          <Textarea 
            {...register("objective")} 
            className="min-h-[200px]"
            placeholder="Write a brief summary of your career objectives..."
          />
          {errors.objective && 
            <p className="text-destructive text-sm">{errors.objective.message}</p>}
        </div>
      </div>
    )
}