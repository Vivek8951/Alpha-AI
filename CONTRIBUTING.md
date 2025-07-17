# Contributing to Alpha AI Storage

Thank you for your interest in contributing to Alpha AI Storage! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- Git
- MetaMask wallet
- Basic knowledge of React, TypeScript, and blockchain concepts

### Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/yourusername/alpha-ai-storage.git
   cd alpha-ai-storage
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables (see README.md)

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 How to Contribute

### Reporting Issues

- Use the GitHub issue tracker
- Provide detailed reproduction steps
- Include system information and error messages
- Check if the issue already exists

### Submitting Changes

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes following our coding standards

3. Test your changes thoroughly

4. Commit with clear messages:
   ```bash
   git commit -m "feat: add new storage provider validation"
   ```

5. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

6. Create a Pull Request

### Pull Request Guidelines

- Provide a clear description of changes
- Reference related issues
- Include screenshots for UI changes
- Ensure all tests pass
- Update documentation if needed

## 🎯 Development Guidelines

### Code Style

- Use TypeScript for type safety
- Follow ESLint configuration
- Use Prettier for code formatting
- Write meaningful variable and function names
- Add comments for complex logic

### Component Structure

```typescript
// Good component structure
interface ComponentProps {
  title: string;
  onAction: () => void;
}

export function Component({ title, onAction }: ComponentProps) {
  // Component logic here
  return (
    <div className="component-container">
      {/* JSX here */}
    </div>
  );
}
```

### Commit Message Format

Use conventional commits:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

### Testing

- Write unit tests for new functions
- Test UI components with user interactions
- Verify blockchain integration works
- Test provider functionality

## 🏗️ Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Application pages
├── lib/           # Utilities and configurations
├── hooks/         # Custom React hooks
└── types/         # TypeScript type definitions

cli/               # Provider CLI tools
contracts/         # Smart contracts
supabase/         # Database migrations
```

## 🔧 Areas for Contribution

### High Priority

- [ ] Enhanced file encryption methods
- [ ] Provider reputation system
- [ ] Mobile responsive improvements
- [ ] Performance optimizations
- [ ] Error handling improvements

### Medium Priority

- [ ] Additional blockchain network support
- [ ] File sharing capabilities
- [ ] Advanced search and filtering
- [ ] Provider analytics dashboard
- [ ] Automated testing suite

### Documentation

- [ ] API documentation
- [ ] Provider setup guides
- [ ] Troubleshooting guides
- [ ] Video tutorials
- [ ] Code examples

## 🐛 Bug Reports

When reporting bugs, include:

1. **Environment**: OS, browser, Node.js version
2. **Steps to reproduce**: Clear, numbered steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Screenshots**: If applicable
6. **Console errors**: Any error messages

## 💡 Feature Requests

For new features:

1. Check existing issues first
2. Describe the problem you're solving
3. Explain your proposed solution
4. Consider implementation complexity
5. Discuss potential alternatives

## 🔒 Security

- Report security vulnerabilities privately
- Don't include sensitive data in issues
- Follow secure coding practices
- Validate all user inputs
- Use proper authentication methods

## 📚 Resources

- [React Documentation](https://reactjs.org/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [IPFS Documentation](https://docs.ipfs.io)
- [BSC Documentation](https://docs.binance.org/smart-chain)

## 🤝 Community

- Be respectful and inclusive
- Help others learn and grow
- Share knowledge and experiences
- Follow our code of conduct
- Participate in discussions

## 📞 Getting Help

- GitHub Discussions for questions
- Discord for real-time chat
- Stack Overflow for technical issues
- Email for private matters

Thank you for contributing to Alpha AI Storage! 🚀