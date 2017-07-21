module VirtualDom.Attributes exposing (..)

import VirtualDom.Element exposing (Attribute)
import Json.Encode as Json
import VirtualDom


stringProperty : String -> String -> Attribute msg
stringProperty name string =
    VirtualDom.property name (Json.string string)


intProperty : String -> Int -> Attribute msg
intProperty name int =
    VirtualDom.property name (Json.int int)


stringYogaProperty : String -> String -> Attribute msg
stringYogaProperty name string =
    VirtualDom.yogaProperty name (Json.string string)


intYogaProperty : String -> Int -> Attribute msg
intYogaProperty name int =
    VirtualDom.yogaProperty name (Json.int int)


floatYogaProperty : String -> Float -> Attribute msg
floatYogaProperty name float =
    VirtualDom.yogaProperty name (Json.float float)



{- LABEL -}


text : String -> Attribute msg
text value =
    stringProperty "text" value



-- TODO rewrite with textColor using Color


textColor : String -> Attribute msg
textColor value =
    stringProperty "textColor" value



-- type TextAlign
--     = Left
--     | Center
--     | Right
--     | Justified
--     | Natural
--
--
-- type FlexJustify
--     = FlexStart
--     | FlexEnd
--     | Center
--     | SpaceBetween
--     | SpaceAround


type Value a
    = Value a


left : Value String
left =
    Value "left"


center : Value String
center =
    Value "center"


right : Value String
right =
    Value "right"


justified : Value String
justified =
    Value "justified"


natural : Value String
natural =
    Value "natural"



-- textAlignment : TextAlign -> Property msg
-- textAlignment value =
--     intProperty "textAlignment" <|
--         case value of
--             Left ->
--                 0
--
--             Center ->
--                 1
--
--             Right ->
--                 2
--
--             Justified ->
--                 3
--
--             Natural ->
--                 4
-- toCamelString : a -> String
-- toCamelString enum =
--     case String.uncons (toString enum) of
--         Just ( x, xs ) ->
--             String.cons (Char.toLower x) xs
--
--         Nothing ->
--             ""
--
--
-- textAlignment : TextAlign -> Property msg
-- textAlignment value =
--     stringProperty "textAlignment" (toCamelString value)


textAlignment : Value String -> Attribute msg
textAlignment (Value value) =
    stringProperty "textAlignment" value



-- flexDirection : String -> Property msg
-- flexDirection value =
--     stringYogaProperty "flexDirection" value


flexGrow : Float -> Attribute msg
flexGrow value =
    floatYogaProperty "flexGrow" value


justifyContent : String -> Attribute msg
justifyContent value =
    stringYogaProperty "justifyContent" value


alignItems : String -> Attribute msg
alignItems value =
    stringYogaProperty "alignItems" value
