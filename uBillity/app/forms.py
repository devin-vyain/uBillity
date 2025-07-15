from django import forms
from .models import Bill
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Submit

class BillForm(forms.ModelForm):
    class Meta:
        model = Bill
        fields = ['name', 'description', 'amount']

    def __init__(self, *args, **kwargs):
        super(BillForm, self).__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.add_input(Submit('submit', 'Save'))
