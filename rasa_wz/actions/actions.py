# This files contains your custom actions which can be used to run
# custom Python code.
#
# See this guide on how to implement these action:
# https://rasa.com/docs/rasa/custom-actions


# This is a simple example for a custom action which utters "Hello World!"

from typing import Any, Text, Dict, List

from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher


class ActionHelloWorld(Action):

    def name(self) -> Text:
        return "action_hello_world"

    def run(self, dispatcher: CollectingDispatcher,
            tracker: Tracker,
            domain: Dict[Text, Any]) -> List[Dict[Text, Any]]:

        dispatcher.utter_message(text="Hello World!")

        return []



class ActionAnswer_budget(Action):
    def name(self) -> Text:
        return "action_answer_budget"

    def run(self, dispatcher,tracker,domain):
        budget = tracker.get_slot('budget')
        
        # text1=f"你要的预算为{budget}的电脑是这台联想的拯救者系列-----i7的处理器，16G内存，512的固态."
        # dispatcher.utter_message(text=text1)
        
        text = "你要的预算为{}的电脑是这台联想的拯救者系列-----i7的处理器，16G内存，512的固态.".format(budget)
        dispatcher.utter_message(text=text)
        #上面这条怎么不输出
        text1 = "{}这个价位这台联想的电脑对于您是比较合适的选择，因此推荐给您，希望您满意".format(budget)
        dispatcher.utter_message(text=text1)
        return []



