import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { UseFormRegister } from "react-hook-form";

interface DatePickerComponentProps {
  label: string;
  end?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  schema?: string;
}

export default function DatePickerComponent({
  label,
  end = false,
  register,
  schema = "personalDetails.startDate",
}: DatePickerComponentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [displayValue, setDisplayValue] = useState<string>("");
  const [year, setYear] = useState(new Date().getFullYear());

  const months = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  const handleSelect = (month: number) => {
    const newDate = new Date(year, month);
    setSelectedDate(newDate);
    setDisplayValue(format(newDate, "MMMM yyyy"));
    setIsOpen(false);
  };

  const handlePresent = () => {
    setSelectedDate(null);
    setDisplayValue("Present");
    setIsOpen(false);
  };

  const changeYear = (increment: number) => {
    setYear(prev => prev + increment);
  };

  useEffect(() => {
    register(schema).onChange({
      target: { value: displayValue, name: schema }
    });
  }, [displayValue, register, schema]);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !displayValue && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {displayValue || "Pick a month"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="flex items-center justify-between border-b p-2">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-transparent p-0 hover:bg-muted"
              onClick={() => changeYear(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="font-semibold">{year}</div>
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7 bg-transparent p-0 hover:bg-muted"
              onClick={() => changeYear(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 p-2">
            {months.map((month, index) => (
              <Button
                key={month}
                variant="ghost"
                className={cn(
                  "h-9 w-full p-0",
                  selectedDate &&
                    selectedDate.getMonth() === index &&
                    selectedDate.getFullYear() === year &&
                    "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                )}
                onClick={() => handleSelect(index)}
              >
                {month.slice(0, 3)}
              </Button>
            ))}
          </div>
          {end && (
            <div className="border-t p-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={handlePresent}
              >
                Present
              </Button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}