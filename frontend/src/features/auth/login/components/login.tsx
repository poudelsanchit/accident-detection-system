"use client"

import * as React from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
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
        .min(1, "Password is required"),
})

export default function LoginForm() {
    const [isLoading, setIsLoading] = React.useState(false)
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            prefix: "+977",
            phoneNumber: "",
            password: "",
        },
    })

    async function onSubmit(data: z.infer<typeof formSchema>) {
        setIsLoading(true)

        try {

            const result = await signIn("credentials", {
                phone: data.phoneNumber,
                password: data.password,
                redirect: false,
            })

            if (!result?.ok) {
                throw new Error(result?.error || "Login failed")
            }

            toast.success("Login successful!", {
                description: `Welcome back! You've been signed in.`,
                position: "top-center",
            })

            // Reset form after successful login
            form.reset()

            // Redirect to dashboard or home
            router.push("/dashboard")

        } catch (error) {
            toast.error("Login failed", {
                description: error instanceof Error ? error.message : "Invalid credentials. Please try again.",
                position: "top-center",
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-linear-to-br from-background to-muted/20">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="space-y-1 text-center">
                    <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
                    <CardDescription>
                        Enter your credentials to sign in
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form id="login-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FieldGroup>
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
                                            autoComplete="current-password"
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
                                form="login-form"
                                className="flex-1"
                                disabled={isLoading}
                            >
                                {isLoading ? "Signing in..." : "Sign In"}
                            </Button>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            Don't have an account?
                            <Link href={'/auth/signup'} className="text-primary"> Sign up</Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}