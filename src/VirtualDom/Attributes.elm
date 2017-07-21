module VirtualDom.Attributes exposing (..)

import VirtualDom.Element exposing (Attribute)
import Json.Encode as Json
import VirtualDom


-- Property Helpers


stringProperty : String -> String -> Attribute msg
stringProperty name string =
    VirtualDom.property name (Json.string string)


intProperty : String -> Int -> Attribute msg
intProperty name int =
    VirtualDom.property name (Json.int int)



-- Yoga Property Helpers


stringYogaProperty : String -> String -> Attribute msg
stringYogaProperty name string =
    VirtualDom.yogaProperty name (Json.string string)


intYogaProperty : String -> Int -> Attribute msg
intYogaProperty name int =
    VirtualDom.yogaProperty name (Json.int int)


floatYogaProperty : String -> Float -> Attribute msg
floatYogaProperty name float =
    VirtualDom.yogaProperty name (Json.float float)



-- Label


text : String -> Attribute msg
text value =
    stringProperty "text" value



-- TODO rewrite with textColor using Color


textColor : String -> Attribute msg
textColor value =
    stringProperty "textColor" value


textAlignment : String -> Attribute msg
textAlignment value =
    stringProperty "textAlignment" value



-- Yoga


flexGrow : Float -> Attribute msg
flexGrow value =
    floatYogaProperty "flexGrow" value


justifyContent : String -> Attribute msg
justifyContent value =
    stringYogaProperty "justifyContent" value


alignItems : String -> Attribute msg
alignItems value =
    stringYogaProperty "alignItems" value
