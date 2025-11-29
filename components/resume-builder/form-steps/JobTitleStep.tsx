import { Input } from "@/components/ui/input";
import { Label } from "@radix-ui/react-dropdown-menu";
import { UseFormRegister, FieldErrors } from "react-hook-form";
import { FormValues } from "../types";

interface JobTitleStepProps {
    register: UseFormRegister<FormValues>;
    errors: FieldErrors<FormValues>;
}

export const JobTitleStep: React.FC<JobTitleStepProps> = ({ register, errors }) => {
    return(
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Job Title</Label>
                <Input 
                    {...register("jobTitle")} 
                    placeholder="Enter your desired job title (e.g.,Undergrad student, UI Developer, Business Analyst)"
                    className="w-full"
                />
                {errors.jobTitle && 
                    <p className="text-destructive text-sm">{errors.jobTitle.message}</p>}
            </div>
        </div>
    )
}