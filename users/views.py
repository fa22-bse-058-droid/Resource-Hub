from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages


def login_view(request):
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        user     = authenticate(request, username=username, password=password)
        if user:
            login(request, user)
            return redirect('index')
        messages.error(request, 'Invalid credentials')
    return render(request, 'users/login.html')


def logout_view(request):
    logout(request)
    return redirect('login')


def register_view(request):
    if request.method == 'POST':
        username  = request.POST.get('username')
        password  = request.POST.get('password')
        password2 = request.POST.get('password2')
        email     = request.POST.get('email', '')

        if password != password2:
            messages.error(request, 'Passwords do not match')
            return render(request, 'users/register.html')

        if User.objects.filter(username=username).exists():
            messages.error(request, 'Username already taken')
            return render(request, 'users/register.html')

        user = User.objects.create_user(username=username, password=password, email=email)
        login(request, user)
        return redirect('index')

    return render(request, 'users/register.html')