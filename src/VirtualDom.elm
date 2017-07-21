module VirtualDom
    exposing
        ( Node
        , leaf
        , parent
        , Property
        , property
        , yogaProperty
        , lazy
        , lazy2
        , lazy3
        , program
        , programWithFlags
        )

{-| #VirtualDom
@docs Node, leaf, parent, Property, property, yogaProperty, lazy, lazy2, lazy3, program, programWithFlags
-}

import Json.Decode as Json
import Native.VirtualDom
import VirtualDom.Debug as Debug


{-| -}
type Node msg
    = Node


{-| -}
parent : List (Property msg) -> List (Node msg) -> Node msg
parent =
    Native.VirtualDom.parent


{-| -}
leaf : String -> List (Property msg) -> Node msg
leaf =
    Native.VirtualDom.leaf


{-| -}
type Property msg
    = Property


{-| -}
property : String -> Json.Value -> Property msg
property =
    Native.VirtualDom.property


{-| -}
yogaProperty : String -> Json.Value -> Property msg
yogaProperty =
    Native.VirtualDom.yogaProperty


{-| -}
lazy : (a -> Node msg) -> a -> Node msg
lazy =
    Native.VirtualDom.lazy


{-| -}
lazy2 : (a -> b -> Node msg) -> a -> b -> Node msg
lazy2 =
    Native.VirtualDom.lazy2


{-| -}
lazy3 : (a -> b -> c -> Node msg) -> a -> b -> c -> Node msg
lazy3 =
    Native.VirtualDom.lazy3


{-| -}
program :
    { init : ( model, Cmd msg )
    , update : msg -> model -> ( model, Cmd msg )
    , subscriptions : model -> Sub msg
    , view : model -> Node msg
    }
    -> Program Never model msg
program impl =
    Native.VirtualDom.program Debug.wrap impl


{-| -}
programWithFlags :
    { init : flags -> ( model, Cmd msg )
    , update : msg -> model -> ( model, Cmd msg )
    , subscriptions : model -> Sub msg
    , view : model -> Node msg
    }
    -> Program flags model msg
programWithFlags impl =
    Native.VirtualDom.programWithFlags Debug.wrapWithFlags impl
