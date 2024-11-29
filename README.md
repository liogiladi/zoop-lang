<!-- PROJECT LOGO -->
<br />
<div align="center">
    <picture>
        <source media="(prefers-color-scheme: light)" srcset="https://github.com/liogiladi/web-os/blob/a7f67cd09365cc8fc8096f049d6d4f88ae353137/media/svgs/logo-basic-black.svg">
        <source media="(prefers-color-scheme: dark)" srcset="https://github.com/liogiladi/web-os/blob/a7f67cd09365cc8fc8096f049d6d4f88ae353137/media/svgs/logo-basic.svg">
        <img width="100px"/>
    </picture>

  <h3 align="center">Zoop language</h3>
  <i align="center">zoop de loop</i>
</div>

<!-- ABOUT THE PROJECT -->

## About The Project

A basic interpreter for Zoop language

# Data types
| Name     | Examples        |
|----------|-----------------|
| `bool`   | `false`, `true` |
| `int`    | `4`, `-5`       |
| `uint`   | `4`             |
| `dec`    | `4.5`, `-5.5`   |
| `udec`   | `4.5`           |
| `string` | `"Hello"`       |

# Operators
## Arithmatic
| Operator             | Description                                               | Example                          |
|----------------------|-----------------------------------------------------------|----------------------------------|
| Basic (`+ - * /`)    | Cover the basic arithmatic we all know and love           | 2+2 equals 3+1                   |
| Unary negation (`-`) | Prefix unary operator. Return the negation of its operand | if `x` is 1 then `-x` returns -1 |

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
| Operator              | Description                                                                     | Examples returning `true`  |
|-----------------------|---------------------------------------------------------------------------------|----------------------------|
| AND (`&`)             | Returns true if both the operands yield `true`                                  | `4=4 & 2>1`                |
| OR (`\|`)             | Returns true if at least one of the operands yield `true`                       | `4=4 \| 2>1`, `4=4 \| 2=1` |
| Strict OR / XOR (`^`) | Returns true if and only if one the operands is `true` and the other is `false` | `4=4 ^ 2=1`                |
| Unary NOT (`~`)       | Prefix unary operator. Negates the bool value of its operand                    | `~(1 > 3)`                 |

## Strings
| Operator            | Description                                 | Examples           |
|---------------------|---------------------------------------------|--------------------|
| Concatenation (`_`) | Concats its 2 operands into 1 string result | `"Hello "_"World"` |

# Variables
```zoop
<@ | $> <identifier> : <type> <- <value>
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
     
<!-- ROADMAP -->

## Roadmap

-   [ ] Roadmap

<!-- CONTRIBUTING -->

## Contributing

This README file uses an awesome template :) [check it out!](https://github.com/othneildrew/Best-README-Template)
(The license is provided in the root folder)
