// src/App.jsx

        <AuthProvider>
          <AppProvider>
            <PlanProvider>
              <AppRoutes />
            </PlanProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  )
}
