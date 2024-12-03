<!-- PROJECT LOGO -->
<br />
<div align="center">
   <!--  <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://github.com/liogiladi/web-os/blob/a7f67cd09365cc8fc8096f049d6d4f88ae353137/media/svgs/logo-basic-black.svg">
        <source media="(prefers-color-scheme: dark)" srcset="https://github.com/liogiladi/web-os/blob/a7f67cd09365cc8fc8096f049d6d4f88ae353137/media/svgs/logo-basic.svg">
        <img width="100px"/>
    </picture> -->
    <img width="100px" src="https://github.com/liogiladi/zoop/blob/main/ZOOP%20LOGO.png" />

  <h3 align="center">Zoop language</h3>
  <i align="center">"zoop de loop"</i>
</div>

---
<!-- ABOUT THE PROJECT -->

A basic interpreter for Zoop language.

> Unfortunetly, markdown's custom code snippets / html tags cannot be highlighted.
> So everything is a blob of white text :/

# Comments
```zoop
-- This is a line comment
... -- This is a mid-line comment

--* This is a block comment
  * One can comment
  * several things in this one!
*-- 
```

# Data types
| Name     | Examples        |
|----------|-----------------|
| `bool`   | `false`, `true` |
| `int`    | `4`, `-5`       |
| `uint`   | `4`             |
| `dec`    | `4.5`, `-5.5`   |
| `udec`   | `4.5`           |
| `string` | `"Hello"`       |

> **Numeric literals default to a signed type**
> 
> You can create an unsigned literal by post-fixing the number with `u`:
> ```zoop
> 5     -- int
> 5u    -- uint
> 5.3   -- dec
> 5.3u  -- udec
> ```
> (More on type casting later)

# Operators
## Arithmatic
| Operator             | Description                                               | Example                          |
|----------------------|-----------------------------------------------------------|----------------------------------|
| Basic (`+ - * /`)    | Cover the basic arithmatic we all know and love           | 2+2 equals 3+1                   |
| Unary negation (`-`) | Prefix unary operator. Return the negation of its operand | if `x` is 1 then `-x` returns -1 |
> [!NOTE]
> The basic unary negation operator is counted as subtraction if no operator exists between the right and the left:
> ```zoop
> 3 - 5 -- Binary subtraction
> 3  -5 -- Still binary subtraction!
> ```
> Following that, making the `-` adjacent to the right operand, doesn't inherently make the operation unary.
>
> When unary operation is used, the operator must be adjacent the the right:
> ```zoop
> 3 + -5     -- -2
> 3 + - 5    -- Error: Invalid expression
> ```

## Comparison
| Operator                  | Description                                                                   | Examples returning `true` |
|---------------------------|-------------------------------------------------------------------------------|---------------------------|
| Equal (`=`)               | Returns true if the operands are equal in value                               | `2+2 = 1+3`               |
| Not equal (`~=`)          | Return true if the operands are not equal in value                            | `1+2 ~= 2+2`              |
| Greater than (`>=`)       | Return true if the left operand is greater than or equal to the right operand | `3 >= 1`, `1 >= 1`        |
| Strict greater than (`>`) | Return true if the left operand is strictly greater than the right operand    | `3 > 1`                   |
| Less than (`<=`)          | Return true if the left operand is less than or equal to the right operand    | `1 <= 3`, `1 <= 1`        |
| Strict less than (`<`)    | Return true if the left operand is strictly less than the right operand       | `1 < 3`                   |

## Logic
| Operator                | Description                                                                     | Examples returning `true`  |
|-------------------------|---------------------------------------------------------------------------------|----------------------------|
| AND (`&`)               | Returns true if both the operands yield `true`                                  | `4=4 & 2>1`                |
| OR (`\|`)               | Returns true if at least one of the operands yield `true`                       | `4=4 \| 2>1`, `4=4 \| 2=1` |
| Strict OR / XOR (`\|\|`)| Returns true if and only if one the operands is `true` and the other is `false` | `4=4 \|\| 2=1`             |
| Unary NOT (`~`)         | Prefix unary operator. Negates the bool value of its operand                    | `~(1 > 3)`                 |

## Strings
| Operator            | Description                                 | Examples           |
|---------------------|---------------------------------------------|--------------------|
| Concatenation (`_`) | Concats its 2 operands into 1 string result | `"Hello "_"World"` |

## Data Types
| Operator        | Description                                             | Examples      |
|-----------------|---------------------------------------------------------|---------------|
| Cast (`~ TYPE`) | Casts the left operand to the type given to the right.  | `4~dec` (4.0) |

# Conversion Table
| From            | To            | Result        | Description                                                                                                                                            | Examples                                    |
|-----------------|---------------|---------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------|
| Any             | `string`      | `string`      | The string representaion of any value matches as seen in output/code                                                                                   | `4.5~string` 4.5                            |
| `int`           | `uint`        | `uint`        | If the source is negative then it turns to 0; Else remains the same                                                                                    | `(-5)~uint` 0 `5~uint` 5                    |
| `uint`          | `int`         | `int`         | Remains the same                                                                                                                                       | `(5~uint)~int` 5                            |
| `dec`           | `udec`        | `udec`        | If the source is negative then it turns to 0.0; Else remains the same                                                                                  | `(-5.0)~udec` 0.0                           |
| `udec`          | `dec`         | `udec`        | Remains the same                                                                                                                                       | `(5.4~udec)~dec` 5.4                        |
| `udec`, `dec`   | `uint,int`    | `uint,int`    | The fractional part is tossed away, leaving you with the integer one.  Casting a negative value to an unsigned type, follows the same as above - 0/0.0 | `(-5.2)~uint` 0 `5.8~int` 5                 |
| `uint,int`      | `udec`, `dec` | `udec`, `dec` | Remains the same unless you cast a negative value to an unsigned type,  which will follow the same as above - 0.0                                      | `5~udec` 5.0 `(-5)~udec` 0                  |
| Numeric         | `bool`        | `bool`        | If the value is 0 then it turns to `false` Else `true`                                                                                                 | `4~bool` true `-5~bool` true `0~bool` false |
| `bool`          | Numeric       | `bool`        | If the value is `true` then it turns to 0 Else 1                                                                                                       | `true~int` 1 `false~udec` 0.0               |
| **Non Numeric** | **Numeric**   | **NONE**      | **Can no do. This result in an error!**                                                                                                                | **NONE**                                    |

# Variables
```zoop
<@ | $> IDENTIFIER : TYPE <- VALUE
```

**Rules:**
1. Every time declaring/reassinging variables, you must state its immutability as a prefix (`@` - mutable, `$` - immutable).
2. Identifiers can only contain english letters and numbers in the form `[a-zA-Z]+[a-zA-Z\d]*`.
3. When declaring a variable, you must state its data type from the mentioned above.
4. When declaring, you must assign the variable, disregarding its immutabilty.
5. As the name suggest, you can only assign immutables once - in declaration.

_Example of printing a division:_
```zoop
@a:int <- 10
@b:int <- 5
$aDivB:int <- 10 / 5 ->|
```

**Variable declarations/assignments are expression statements!**
They evaluate to the value they are being assigned to.

_Meaning you can do stuff like these:_
```zoop
@sum1:uint <- @sum2:uint <- 0

@sumAvg <- (@sum1 <- 50 + @sum2 <- 20) / 2 
```

# Terminal Flow
## Output
Use the `->|` operator at the end of a statement (end of line) to output its expression. 
**The operator must end the line as it consumes everything to its left to be an expression.**

_Example printing Hello World:_
```zoop
"Hello World" ->|
```

## Input
Use the `<-|` expression to scan an input from the terminal. 
As the keyword is an expression (not an operator), you can do all sorts of mixtures

_Examples:_
```zoop
@firstName:string <- <-|
@lastName:string <- <-|
@fullName:string <- @firstName_" "_@lastName

-- This also works
@fullName:string <- <-| _ <-|
```

> [!IMPORTANT]
> **Input by default are always returned as a string!**
> 
> For other result types, you need to specify a type for the input:
> ```zoop
> @age:uint <- <-| -- Runtime Error: Cannot assign <string> to variable '@age' of type <uint>.
>
> @age:uint <- <-|:uint -- This will work, you are specificaly requesting an unsigned integer.
> ```

# Precedence
The expressions mentioned above have an operation precedence as such (DESC order):

| Name          | Operations                                                                    |
|---------------|-------------------------------------------------------------------------------|
| Primary       | Grouping `()`, Input `<-\|`, Declaration/Assignment, De `de` (Zoop execution) |
| Cast          | Casting Binary operation `~`                                                  |
| Unary         | NOT `~`, Negative `-`                                                         |
| Factor        | Multiplication `*`, Division `/`                                              |
| Term          | Addition `+`, Subtraction `-`                                                 |
| Comparision   | Greater `>=`, Strict Greater `>`, Less `<=`, Strict Less `<`                  |
| Equality      | Equals `=`, Not Equals `~=`                                                   |
| Logic         | AND `&`, OR `\|`, XOR `\|\|`                                                  |
| Concatenation | `_`                                                                           |

**If operations are in the same level of precedence, they are performed left to right**

Examples:
```zoop
2 + 5 > 6 = 2
-- (2+5) > 6 = 2
-- (7 > 6) = 2
-- Error: Cannot compare equality of <bool> with <int> 
```
```zoop
2 + 5 > 6 & false _ 3 + -5.5~int _ "HI"
-- ((7>6) & false) _ 3 + -(5.5~int) _ "HI"
-- false _ (3 - 5) _ "HI"
-- Result: "false_-2_HI" 
```

# Scopes

Scopes for variables are created only by using curly braces `{}`.

Variables created in a scope, get tossed away once its statements get executed:
```zoop
{
    @num:int <- 5 ->| -- Output: 5
}

@num ->| -- Error: Undefined variable '@num'
```

> Declaring num outside of the scope will work.

Nestings work aswell:
```zoop
{
    @num:int <- 5 ->| -- Output: 5

   {
      @num:bool <- false ->| -- Output: false   
   }
}
```

---

**Variables declared in an inner scope shadow same name variables which are defined in an outer scope:**
```zoop
@a:num <- 3 ->| -- Output: 3

{
    @a:string <- "New value" -- Output: New value
}

@a ->| -- Output: 3
```

Notice that if not declared in an inner scope, assignment occurs on parent scopes:
```zoop
@a:num <- 3 ->| -- Output: 3

{
    @a <- 8
    @a:string <- "New value" -- Output: New value
}

@a ->| -- Output: 8
```

---

# Control Flow
Pretty Standard stuff if I might say:
```zoop
if EXPRESSION
    ...
end if
elif EXPRESSION
    ...
end elif
.
.
.
else
    ...
end else
```

You can shorthand the condition to one statement:
```zoop
if EXPRESSION => STATEMENT
elif EXPRESSION => STATEMENT
.
.
.
else => STATEMENT
```

> [!IMPORTANT]
> **As menitoned in the previous section, only `{}` creates a scope.**
> Therefore everything that executes inside the conditions (or zoops, which will be explained later) are in recording to the current scope.

---

# Zoops
Use zoops to resuse functionality across your code, hence _"zoop de loop"_.

```zoop
zoop:TYPE`name` <- $param1:TYPE ... $paramN:TYPE
    ...
    VALUE ->
end zoop

-- One statement (that harbors a return statement)
zoop:TYPE`name` <- $param1:TYPE ... $paramN:TYPE => STATEMENT

-- Void (no return value)
zoop`name` <- ...
    -> -- Early return
end zoop

-- No parameters
zoop:TYPE`name`
    ...
end zoop
```

> [!IMPORTANT]
> **Zoops don't create scopes!** 
> Upon exacting the zoop, the arguments are injected to a new context in the De Stack in the global scope and are tossed out when the block ends.
>
> **Zoop's parameters must be immutable**
> That's how it is mates.

## Exacting the zoop
```zoop
`name` de EXPRESSION1 ... EXPRESSION_N
```
---
Example:
```zoop
zoop:dec`clamp` <- $min:dec $val:dec $max:dec
    if $val < $min => $min ->
    elif $val > $max => $max ->
    $val ->
end zoop

@calmpedNum:dec <- `clamp` de 5.3 2.4 7.8 -- 2.4
```

Implementaion of `pow` zoop (for integer exponents):
```zoop
zoop:dec`_pow` <- $base:dec $exp:uint => {
    if $exp = 0u => 1.0 ->
    elif $exp = 1u => $base ->

    @dst:uint <- $exp-1u
    @src:dec <- $base

    $base * `_pow` de @src @dst ->
}

zoop:dec`pow` <- $base:dec $exp:int => {
    if $exp = 1 => 1 ->
    if $exp > 0 => `_pow` de $base $exp~uint ->
    1.0 / (`_pow` de $base (-$exp)~uint) ->
}

`pow` de -3.0 (-2) ->|
```
> [!NOTE]
> Notice that the second argument must be wraped in `()`.
> As mentioned above, if the argument won't be grouped, it will parsed as part of a binary operation with `-3.0`
> and there will be an arguments - parameters count mismatch

## Roadmap

-   [ ] Secret
-   [ ] Switch case like?
-   [ ] Error handeling

<!-- CONTRIBUTING -->

## Contributing

This README file uses an awesome template :) [check it out!](https://github.com/othneildrew/Best-README-Template)

(The license is provided in the root folder)
