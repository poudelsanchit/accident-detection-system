"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import * as z from "zod"

import { Button } from "@/core/components/ui/button"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/core/components/ui/card"
import {
    Field,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/core/components/ui/select"
import {
    InputGroup,
    InputGroupAddon,
} from "@/core/components/ui/input-group"
import Link from "next/link"

const formSchema = z.object({
    fullName: z.string().min(5, "Fullname must be at least 5 characters long")
    ,
    prefix: z
        .string()
        .min(1, "Please select a prefix"),
    phoneNumber: z
        .string()
        .min(10, "Phone number must be at least 10 digits")
        .max(10, "Phone number must be exactly 10 digits")
        .regex(/^\d+$/, "Phone number must contain only digits"),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z
        .string()
        .min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

export default function SignupForm() {
    const [isLoading, setIsLoading] = React.useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            fullName:"",
            prefix: "+977",
            phoneNumber: "",
            password: "",
            confirmPassword: "",
        },
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        setIsLoading(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    fullName: data.fullName,
                    phoneNumberPrefix: data.prefix,
                    phoneNumber: data.phoneNumber,
                    password: data.password,
                }),
            })

            const result = await response.json()

            if (!response.ok) {
                throw new Error(result.message || 'Signup failed')
            }

            toast.success("Account created successfully!", {
                description: `Welcome! Your phone number ${data.prefix}${data.phoneNumber} has been registered.`,
                position: "top-center",
            })

            // Reset form after successful signup
            form.reset()

            // Optional: Redirect to login or dashboard
            // router.push('/login')

        } catch (error) {
            toast.error("Signup failed", {
                description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
                position: "top-center",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
                    <CardDescription>
                        Enter your details to sign up
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="signup-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FieldGroup>
                            
                               <Controller
                                name="fullName"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="fullname">
                                            Full Name
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="fullName"
                                            type="text"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter your Full Name"
                                            disabled={isLoading}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="phoneNumber"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="phone-number">
                                            Phone Number
                                        </FieldLabel>
                                        <InputGroup>
                                            <InputGroupAddon>
                                                <Controller
                                                    name="prefix"
                                                    control={form.control}
                                                    render={({ field: prefixField }) => (
                                                        <Select
                                                            value={prefixField.value}
                                                            onValueChange={prefixField.onChange}
                                                        >
                                                            <SelectTrigger className="w-[100px] border-0 bg-transparent focus:ring-0 focus:ring-offset-0">
                                                                <SelectValue placeholder="Prefix" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="+977">🇳🇵 +977</SelectItem>
                                                                <SelectItem value="+91">🇮🇳 +91</SelectItem>
                                                                <SelectItem value="+1">🇺🇸 +1</SelectItem>
                                                                <SelectItem value="+44">🇬🇧 +44</SelectItem>
                                                                <SelectItem value="+86">🇨🇳 +86</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                />
                                            </InputGroupAddon>
                                            <Input
                                                {...field}
                                                id="phone-number"
                                                type="tel"
                                                aria-invalid={fieldState.invalid}
                                                placeholder="9800000000"
                                                autoComplete="tel"
                                                className="border-l-0"
                                                disabled={isLoading}
                                            />
                                        </InputGroup>
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="password"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="password">
                                            Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="password"
                                            type="password"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Enter your password"
                                            autoComplete="new-password"
                                            disabled={isLoading}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />

                            <Controller
                                name="confirmPassword"
                                control={form.control}
                                render={({ field, fieldState }) => (
                                    <Field data-invalid={fieldState.invalid}>
                                        <FieldLabel htmlFor="confirm-password">
                                            Confirm Password
                                        </FieldLabel>
                                        <Input
                                            {...field}
                                            id="confirm-password"
                                            type="password"
                                            aria-invalid={fieldState.invalid}
                                            placeholder="Confirm your password"
                                            autoComplete="new-password"
                                            disabled={isLoading}
                                        />
                                        {fieldState.invalid && (
                                            <FieldError errors={[fieldState.error]} />
                                        )}
                                    </Field>
                                )}
                            />
                        </FieldGroup>

                        <div className="flex gap-3 pt-2">
                            <Button
                                type="submit"
                                form="signup-form"
                                className="flex-1"
                                disabled={isLoading}
                            >
                                {isLoading ? "Creating account..." : "Sign Up"}
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Already have an account?
                            <Link href={'/auth/login'} className="text-primary"> Sign in</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}